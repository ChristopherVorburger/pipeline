import { afterEach, describe, expect, it, vi } from "vitest"
import type { Contact, ContactDetails, ContactRepository, NewContact } from "@/data/contact-repository"
import {
  addContact,
  checkStorage,
  getContact,
  listContacts,
  updateContactDetails,
} from "@/services/contact-service"

const DURAND_ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b"

function createFakeRepository(initial: Contact[] = []) {
  const contacts = [...initial]
  const repository: ContactRepository = {
    add: vi.fn(async (contact: NewContact) => {
      const created: Contact = {
        ...contact,
        id: crypto.randomUUID(),
        wineTasted: null,
        comment: null,
        lastVisitDate: null,
        createdAt: "2026-11-23T10:00:00.000Z",
      }
      contacts.push(created)
      return created
    }),
    findAll: async () => [...contacts],
    findById: vi.fn(async (id: string) => contacts.find((c) => c.id === id) ?? null),
    update: vi.fn(async (id: string, details: ContactDetails) => {
      const index = contacts.findIndex((c) => c.id === id)
      if (index === -1) return null
      contacts[index] = { ...contacts[index], ...details }
      return contacts[index]
    }),
  }
  return repository
}

function durand(overrides: Partial<Contact> = {}): Contact {
  return {
    id: DURAND_ID,
    lastName: "Durand",
    firstName: null,
    restaurant: "Le Comptoir",
    wineTasted: null,
    comment: null,
    lastVisitDate: null,
    createdAt: "2026-11-23T10:00:00.000Z",
    ...overrides,
  }
}

const NOW = new Date("2026-11-24T10:00:00.000Z")

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("listContacts", () => {
  it("renvoie une liste vide quand il n'y a aucun contact", async () => {
    expect(await listContacts(createFakeRepository())).toEqual([])
  })

  it("renvoie les contacts du repository", async () => {
    const contact = durand()

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

describe("getContact", () => {
  it("renvoie le contact correspondant à l'id", async () => {
    const contact = durand({ wineTasted: "Chablis" })

    expect(await getContact(DURAND_ID, createFakeRepository([contact]))).toEqual({ ok: true, contact })
  })

  it("renvoie notFound pour un id qui n'est pas un UUID, sans interroger le repository", async () => {
    const repository = createFakeRepository([durand()])

    expect(await getContact("abc", repository)).toEqual({ ok: false, reason: "notFound" })
    expect(repository.findById).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un UUID inconnu", async () => {
    const repository = createFakeRepository([durand()])

    expect(await getContact("0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", repository)).toEqual({
      ok: false,
      reason: "notFound",
    })
  })
})

describe("updateContactDetails", () => {
  it("enregistre le vin et le commentaire, puis les retrouve sur la fiche", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(
      DURAND_ID,
      { wineTasted: "Chablis 2022", comment: "Rappeler en décembre", lastVisitDate: "" },
      NOW,
      repository,
    )

    expect(result.ok).toBe(true)
    expect(repository.update).toHaveBeenCalledWith(DURAND_ID, {
      wineTasted: "Chablis 2022",
      comment: "Rappeler en décembre",
      lastVisitDate: null,
    })
    expect(await getContact(DURAND_ID, repository)).toEqual({
      ok: true,
      contact: durand({ wineTasted: "Chablis 2022", comment: "Rappeler en décembre" }),
    })
  })

  it("enlève les espaces autour des valeurs et transforme les champs vides en null", async () => {
    const repository = createFakeRepository([durand({ wineTasted: "Chablis", comment: "Bien" })])

    await updateContactDetails(DURAND_ID, { wineTasted: "  Morgon ", comment: "   " }, NOW, repository)

    expect(repository.update).toHaveBeenCalledWith(DURAND_ID, {
      wineTasted: "Morgon",
      comment: null,
      lastVisitDate: null,
    })
  })

  it("enregistre une date de visite passée", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(DURAND_ID, { lastVisitDate: "2026-11-12" }, NOW, repository)

    expect(result).toEqual({ ok: true, contact: durand({ lastVisitDate: "2026-11-12" }) })
  })

  it("accepte la date du jour", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(DURAND_ID, { lastVisitDate: "2026-11-24" }, NOW, repository)

    expect(result.ok).toBe(true)
  })

  it("refuse une date de visite dans le futur sans rien enregistrer", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(DURAND_ID, { lastVisitDate: "2026-11-25" }, NOW, repository)

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      errors: { lastVisitDate: "La date de visite ne peut pas être dans le futur." },
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it("prend la date du jour à Paris, pas en UTC", async () => {
    const repository = createFakeRepository([durand()])
    const justAfterMidnightInParis = new Date("2026-11-24T23:30:00.000Z")

    const today = await updateContactDetails(
      DURAND_ID,
      { lastVisitDate: "2026-11-25" },
      justAfterMidnightInParis,
      repository,
    )
    const tomorrow = await updateContactDetails(
      DURAND_ID,
      { lastVisitDate: "2026-11-26" },
      justAfterMidnightInParis,
      repository,
    )

    expect(today.ok).toBe(true)
    expect(tomorrow.ok).toBe(false)
  })

  it("refuse une date invalide", async () => {
    const repository = createFakeRepository([durand()])

    for (const lastVisitDate of ["12/11/2026", "2026-02-30", "demain"]) {
      const result = await updateContactDetails(DURAND_ID, { lastVisitDate }, NOW, repository)
      expect(result).toEqual({
        ok: false,
        reason: "invalid",
        errors: { lastVisitDate: "La date de visite est invalide." },
      })
    }
    expect(repository.update).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un id qui n'est pas un UUID, sans appeler update", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails("abc", { wineTasted: "Chablis" }, NOW, repository)

    expect(result).toEqual({ ok: false, reason: "notFound" })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un UUID inconnu", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(
      "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      { wineTasted: "Chablis" },
      NOW,
      repository,
    )

    expect(result).toEqual({ ok: false, reason: "notFound" })
  })
})

describe("checkStorage", () => {
  it("échoue en production sans DATABASE_URL", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DATABASE_URL", "")

    expect(() => checkStorage()).toThrow("DATABASE_URL manquante")
  })
})
