import * as z from "zod"
import {
  getContactRepository,
  type Contact,
  type ContactDetails,
  type ContactRepository,
} from "@/data/contact-repository"

export type { Contact }

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
  wineTasted?: string
  comment?: string
  lastVisitDate?: string
}

export type ContactDetailsErrors = {
  lastVisitDate?: string
}

export type GetContactResult = { ok: true; contact: Contact } | { ok: false; reason: "notFound" }

export type UpdateContactDetailsResult =
  | { ok: true; contact: Contact }
  | { ok: false; reason: "notFound" }
  | { ok: false; reason: "invalid"; errors: ContactDetailsErrors }

export function listContacts(
  repository: ContactRepository = getContactRepository(),
): Promise<Contact[]> {
  return repository.findAll()
}

const TIME_ZONE = "Europe/Paris"

const requiredText = (message: string) => z.string({ error: message }).trim().min(1, message)

const optionalText = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null)

const contactId = z.uuid()

const newContactSchema = z.object({
  lastName: requiredText("Le nom est obligatoire."),
  firstName: optionalText,
  restaurant: requiredText("Le restaurant est obligatoire."),
})

function contactDetailsSchema(now: Date) {
  return z.object({
    wineTasted: optionalText,
    comment: optionalText,
    lastVisitDate: optionalText
      .pipe(z.iso.date({ error: "La date de visite est invalide." }).nullable())
      .refine((date) => date === null || date <= todayIn(TIME_ZONE, now), {
        error: "La date de visite ne peut pas être dans le futur.",
      }),
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

  const contact = await repository.add(parsed.data)
  return { ok: true, contact }
}

export async function getContact(
  rawId: string,
  repository: ContactRepository = getContactRepository(),
): Promise<GetContactResult> {
  const id = contactId.safeParse(rawId)
  if (!id.success) return { ok: false, reason: "notFound" }
  const contact = await repository.findById(id.data)
  return contact ? { ok: true, contact } : { ok: false, reason: "notFound" }
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
  return contact ? { ok: true, contact } : { ok: false, reason: "notFound" }
}

export function checkStorage(): void {
  getContactRepository()
}
