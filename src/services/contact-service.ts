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

export function listContacts(
  repository: ContactRepository = getContactRepository(),
): Promise<Contact[]> {
  return repository.findAll()
}

export async function addContact(
  input: ContactInput,
  repository: ContactRepository = getContactRepository(),
): Promise<AddContactResult> {
  const lastName = input.lastName?.trim() ?? ""
  const firstName = input.firstName?.trim() || null
  const restaurant = input.restaurant?.trim() ?? ""

  const errors: ContactErrors = {}
  if (!lastName) errors.lastName = "Le nom est obligatoire."
  if (!restaurant) errors.restaurant = "Le restaurant est obligatoire."
  if (errors.lastName || errors.restaurant) {
    return { ok: false, errors }
  }

  const contact = await repository.add({ lastName, firstName, restaurant })
  return { ok: true, contact }
}

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_ZONE = "Europe/Paris"

function isValidId(rawId: string): boolean {
  return UUID.test(rawId)
}

function isValidDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
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

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() || null
}

export async function getContact(
  rawId: string,
  repository: ContactRepository = getContactRepository(),
): Promise<GetContactResult> {
  if (!isValidId(rawId)) return { ok: false, reason: "notFound" }
  const contact = await repository.findById(rawId)
  return contact ? { ok: true, contact } : { ok: false, reason: "notFound" }
}

export async function updateContactDetails(
  rawId: string,
  input: ContactDetailsInput,
  now: Date,
  repository: ContactRepository = getContactRepository(),
): Promise<UpdateContactDetailsResult> {
  if (!isValidId(rawId)) return { ok: false, reason: "notFound" }

  const details: ContactDetails = {
    wineTasted: emptyToNull(input.wineTasted),
    comment: emptyToNull(input.comment),
    lastVisitDate: emptyToNull(input.lastVisitDate),
  }

  if (details.lastVisitDate !== null) {
    if (!isValidDate(details.lastVisitDate)) {
      return { ok: false, reason: "invalid", errors: { lastVisitDate: "La date de visite est invalide." } }
    }
    if (details.lastVisitDate > todayIn(TIME_ZONE, now)) {
      return {
        ok: false,
        reason: "invalid",
        errors: { lastVisitDate: "La date de visite ne peut pas être dans le futur." },
      }
    }
  }

  const contact = await repository.update(rawId, details)
  return contact ? { ok: true, contact } : { ok: false, reason: "notFound" }
}

export function checkStorage(): void {
  getContactRepository()
}
