import {
  getContactRepository,
  type Contact,
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

export function checkStorage(): void {
  getContactRepository()
}
