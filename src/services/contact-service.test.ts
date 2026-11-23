import { afterEach, describe, expect, it, vi } from "vitest"
import type { Contact, ContactRepository, NewContact } from "@/data/contact-repository"
import { addContact, checkStorage, listContacts } from "@/services/contact-service"

function createFakeRepository(initial: Contact[] = []) {
  const contacts = [...initial]
  const repository: ContactRepository = {
    add: vi.fn(async (contact: NewContact) => {
      const created = { ...contact, id: String(contacts.length + 1), createdAt: "2026-11-23T10:00:00.000Z" }
      contacts.push(created)
      return created
    }),
    findAll: async () => [...contacts],
  }
  return repository
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("listContacts", () => {
  it("renvoie une liste vide quand il n'y a aucun contact", async () => {
    expect(await listContacts(createFakeRepository())).toEqual([])
  })

  it("renvoie les contacts du repository", async () => {
    const contact: Contact = {
      id: "1",
      lastName: "Durand",
      firstName: null,
      restaurant: "Le Comptoir",
      createdAt: "2026-11-23T10:00:00.000Z",
    }

    expect(await listContacts(createFakeRepository([contact]))).toEqual([contact])
  })
})

describe("addContact", () => {
  it("ajoute un contact avec nom et restaurant, prénom absent à null", async () => {
    const repository = createFakeRepository()

    const result = await addContact({ lastName: "Durand", restaurant: "Le Comptoir" }, repository)

    expect(result.ok).toBe(true)
    expect(repository.add).toHaveBeenCalledWith({
      lastName: "Durand",
      firstName: null,
      restaurant: "Le Comptoir",
    })
    expect(await listContacts(repository)).toHaveLength(1)
  })

  it("enlève les espaces autour des valeurs et garde le prénom", async () => {
    const repository = createFakeRepository()

    await addContact({ lastName: "  Roux ", firstName: " Camille ", restaurant: " Les Halles " }, repository)

    expect(repository.add).toHaveBeenCalledWith({
      lastName: "Roux",
      firstName: "Camille",
      restaurant: "Les Halles",
    })
  })

  it("transforme un prénom vide en null", async () => {
    const repository = createFakeRepository()

    await addContact({ lastName: "Roux", firstName: "   ", restaurant: "Les Halles" }, repository)

    expect(repository.add).toHaveBeenCalledWith(expect.objectContaining({ firstName: null }))
  })

  it("refuse un contact sans nom et signale le nom", async () => {
    const repository = createFakeRepository()

    const result = await addContact({ lastName: "", restaurant: "Le Comptoir" }, repository)

    expect(result).toEqual({ ok: false, errors: { lastName: "Le nom est obligatoire." } })
    expect(repository.add).not.toHaveBeenCalled()
  })

  it("refuse un contact sans restaurant et signale le restaurant", async () => {
    const repository = createFakeRepository()

    const result = await addContact({ lastName: "Durand" }, repository)

    expect(result).toEqual({ ok: false, errors: { restaurant: "Le restaurant est obligatoire." } })
    expect(repository.add).not.toHaveBeenCalled()
  })

  it("refuse des champs ne contenant que des espaces", async () => {
    const repository = createFakeRepository()

    const result = await addContact({ lastName: "   ", restaurant: "  " }, repository)

    expect(result).toEqual({
      ok: false,
      errors: { lastName: "Le nom est obligatoire.", restaurant: "Le restaurant est obligatoire." },
    })
    expect(repository.add).not.toHaveBeenCalled()
  })
})

describe("checkStorage", () => {
  it("échoue en production sans DATABASE_URL", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DATABASE_URL", "")

    expect(() => checkStorage()).toThrow("DATABASE_URL manquante")
  })
})
