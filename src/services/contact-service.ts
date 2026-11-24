import * as z from "zod"
import {
  getContactRepository,
  type Channel,
  type ContactDetails,
  type ContactRepository,
  type Interlocutor,
  type Stage,
  type StoredContact,
  type TastedWine,
} from "@/data/contact-repository"

export type { Channel, Interlocutor, Stage, TastedWine }

export type Contact = StoredContact & {
  isClient: boolean
  nextStage: Stage | null
  previousStage: Stage | null
}

export type ContactInput = {
  lastName?: string
  firstName?: string
  restaurant?: string
}

export type ContactErrors = {
  lastName?: string
  restaurant?: string
}

export type AddContactResult =
  | { ok: true; contact: Contact }
  | { ok: false; errors: ContactErrors }

export type ContactDetailsInput = {
  wineIds?: string[]
  comment?: string
  lastVisitDate?: string
  interlocutor?: string
  channel?: string
}

export type ContactDetailsErrors = {
  wineIds?: string
  lastVisitDate?: string
  interlocutor?: string
  channel?: string
}

export type GetContactResult = { ok: true; contact: Contact } | { ok: false; reason: "notFound" }

export type UpdateContactDetailsResult =
  | { ok: true; contact: Contact }
  | { ok: false; reason: "notFound" }
  | { ok: false; reason: "invalid"; errors: ContactDetailsErrors }

export type AdvanceContactStageResult =
  | { ok: true; contact: Contact }
  | { ok: false; reason: "notFound" | "lastStage" | "conflict" }

export type RevertContactStageResult =
  | { ok: true; contact: Contact }
  | { ok: false; reason: "notFound" | "firstStage" | "conflict" }

const STAGES: readonly Stage[] = ["premier_contact", "degustation", "commande"]

const FIRST_STAGE: Stage = "premier_contact"

const CLIENT_STAGE: Stage = "commande"

function nextStageOf(stage: Stage): Stage | null {
  return STAGES[STAGES.indexOf(stage) + 1] ?? null
}

function previousStageOf(stage: Stage): Stage | null {
  return STAGES[STAGES.indexOf(stage) - 1] ?? null
}

function present(contact: StoredContact): Contact {
  return {
    ...contact,
    isClient: contact.stage === CLIENT_STAGE,
    nextStage: nextStageOf(contact.stage),
    previousStage: previousStageOf(contact.stage),
  }
}

export async function listContacts(
  repository: ContactRepository = getContactRepository(),
): Promise<Contact[]> {
  return (await repository.findAll()).map(present)
}

const TIME_ZONE = "Europe/Paris"

const FOLLOW_UP_AFTER_DAYS = 7

const requiredText = (message: string) => z.string({ error: message }).trim().min(1, message)

const optionalText = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null)

const contactId = z.uuid()

const optionalChoice = <T extends string>(values: readonly [T, ...T[]], message: string) =>
  optionalText.pipe(z.enum(values, { error: message }).nullable())

const newContactSchema = z.object({
  lastName: requiredText("Le nom est obligatoire."),
  firstName: optionalText,
  restaurant: requiredText("Le restaurant est obligatoire."),
})

function contactDetailsSchema(now: Date) {
  return z.object({
    wineIds: z
      .array(z.uuid({ error: "Un vin coché est invalide." }), { error: "Un vin coché est invalide." })
      .default([])
      .transform((ids) => [...new Set(ids)]),
    comment: optionalText,
    lastVisitDate: optionalText
      .pipe(z.iso.date({ error: "La date de visite est invalide." }).nullable())
      .refine((date) => date === null || date <= todayIn(TIME_ZONE, now), {
        error: "La date de visite ne peut pas être dans le futur.",
      }),
    interlocutor: optionalChoice<Interlocutor>(
      ["patron", "sommelier"],
      "L'interlocuteur doit être le patron ou le sommelier.",
    ),
    channel: optionalChoice<Channel>(["en_personne", "telephone"], "Le canal doit être en personne ou par téléphone."),
  })
}

function todayIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

function daysBefore(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export async function listContactsToFollowUp(
  now: Date,
  repository: ContactRepository = getContactRepository(),
): Promise<Contact[]> {
  const cutoff = daysBefore(todayIn(TIME_ZONE, now), FOLLOW_UP_AFTER_DAYS)
  return (await repository.findWithoutVisitSince(cutoff)).map(present)
}

function firstErrors<T>(error: z.ZodError<T>): Partial<Record<keyof T, string>> {
  const { fieldErrors } = z.flattenError(error)
  return Object.fromEntries(
    Object.entries<string[] | undefined>(fieldErrors).map(([field, messages]) => [field, messages?.[0]]),
  ) as Partial<Record<keyof T, string>>
}

export async function addContact(
  input: ContactInput,
  repository: ContactRepository = getContactRepository(),
): Promise<AddContactResult> {
  const parsed = newContactSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error) }
  }

  const contact = await repository.add({ ...parsed.data, stage: FIRST_STAGE })
  return { ok: true, contact: present(contact) }
}

export async function getContact(
  rawId: string,
  repository: ContactRepository = getContactRepository(),
): Promise<GetContactResult> {
  const id = contactId.safeParse(rawId)
  if (!id.success) return { ok: false, reason: "notFound" }
  const contact = await repository.findById(id.data)
  return contact ? { ok: true, contact: present(contact) } : { ok: false, reason: "notFound" }
}

export async function updateContactDetails(
  rawId: string,
  input: ContactDetailsInput,
  now: Date,
  repository: ContactRepository = getContactRepository(),
): Promise<UpdateContactDetailsResult> {
  const id = contactId.safeParse(rawId)
  if (!id.success) return { ok: false, reason: "notFound" }

  const parsed = contactDetailsSchema(now).safeParse(input)
  if (!parsed.success) {
    return { ok: false, reason: "invalid", errors: firstErrors(parsed.error) }
  }

  const details: ContactDetails = parsed.data
  const contact = await repository.update(id.data, details)
  return contact ? { ok: true, contact: present(contact) } : { ok: false, reason: "notFound" }
}

export async function advanceContactStage(
  rawId: string,
  repository: ContactRepository = getContactRepository(),
): Promise<AdvanceContactStageResult> {
  const id = contactId.safeParse(rawId)
  if (!id.success) return { ok: false, reason: "notFound" }

  const contact = await repository.findById(id.data)
  if (!contact) return { ok: false, reason: "notFound" }

  const next = nextStageOf(contact.stage)
  if (!next) return { ok: false, reason: "lastStage" }

  const advanced = await repository.changeStage(id.data, contact.stage, next)
  return advanced ? { ok: true, contact: present(advanced) } : { ok: false, reason: "conflict" }
}

export async function revertContactStage(
  rawId: string,
  repository: ContactRepository = getContactRepository(),
): Promise<RevertContactStageResult> {
  const id = contactId.safeParse(rawId)
  if (!id.success) return { ok: false, reason: "notFound" }

  const contact = await repository.findById(id.data)
  if (!contact) return { ok: false, reason: "notFound" }

  const previous = previousStageOf(contact.stage)
  if (!previous) return { ok: false, reason: "firstStage" }

  const reverted = await repository.changeStage(id.data, contact.stage, previous)
  return reverted ? { ok: true, contact: present(reverted) } : { ok: false, reason: "conflict" }
}

export function checkStorage(): void {
  getContactRepository()
}
