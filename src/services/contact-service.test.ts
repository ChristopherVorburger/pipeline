import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  ContactDetails,
  ContactRepository,
  NewContact,
  Stage,
  StoredContact,
  TastedWine,
} from "@/data/contact-repository"
import {
  addContact,
  advanceContactStage,
  checkStorage,
  getContact,
  listContacts,
  listContactsToFollowUp,
  revertContactStage,
  updateContactDetails,
  type Contact,
} from "@/services/contact-service"

const DURAND_ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b"

const MORGON: TastedWine = { id: "7b2c1d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e", name: "Morgon 2022", domainName: "Château Roux" }

const CHABLIS: TastedWine = { id: "8c3d2e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f", name: "Chablis 2023", domainName: "Domaine Dupont" }

const WINES = new Map([MORGON, CHABLIS].map((wine) => [wine.id, wine]))

function createFakeRepository(initial: StoredContact[] = []) {
  const contacts = [...initial]
  const repository: ContactRepository = {
    add: vi.fn(async (contact: NewContact) => {
      const created: StoredContact = {
        ...contact,
        id: crypto.randomUUID(),
        winesTasted: [],
        comment: null,
        lastVisitDate: null,
        interlocutor: null,
        channel: null,
        createdAt: "2026-11-23T10:00:00.000Z",
      }
      contacts.push(created)
      return created
    }),
    findAll: async () => [...contacts],
    findWithoutVisitSince: vi.fn(async (cutoff: string) =>
      contacts.filter((c) => c.lastVisitDate === null || c.lastVisitDate < cutoff),
    ),
    findById: vi.fn(async (id: string) => contacts.find((c) => c.id === id) ?? null),
    update: vi.fn(async (id: string, details: ContactDetails) => {
      const index = contacts.findIndex((c) => c.id === id)
      if (index === -1) return null
      const { wineIds, ...rest } = details
      const winesTasted = wineIds.flatMap((id) => WINES.get(id) ?? [])
      contacts[index] = { ...contacts[index], ...rest, winesTasted }
      return contacts[index]
    }),
    changeStage: vi.fn(async (id: string, from: Stage, to: Stage) => {
      const index = contacts.findIndex((c) => c.id === id && c.stage === from)
      if (index === -1) return null
      contacts[index] = { ...contacts[index], stage: to }
      return contacts[index]
    }),
  }
  return repository
}

function durand(overrides: Partial<StoredContact> = {}): StoredContact {
  return {
    id: DURAND_ID,
    lastName: "Durand",
    firstName: null,
    restaurant: "Le Comptoir",
    winesTasted: [],
    comment: null,
    lastVisitDate: null,
    stage: "premier_contact",
    interlocutor: null,
    channel: null,
    createdAt: "2026-11-23T10:00:00.000Z",
    ...overrides,
  }
}

const NEXT_STAGES: Record<Stage, Stage | null> = {
  premier_contact: "degustation",
  degustation: "commande",
  commande: null,
}

const PREVIOUS_STAGES: Record<Stage, Stage | null> = {
  premier_contact: null,
  degustation: "premier_contact",
  commande: "degustation",
}

function shown(contact: StoredContact): Contact {
  return {
    ...contact,
    isClient: contact.stage === "commande",
    nextStage: NEXT_STAGES[contact.stage],
    previousStage: PREVIOUS_STAGES[contact.stage],
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

    expect(await listContacts(createFakeRepository([contact]))).toEqual([shown(contact)])
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
      stage: "premier_contact",
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
      stage: "premier_contact",
    })
  })

  it("transforme un prénom vide en null", async () => {
    const repository = createFakeRepository()

    await addContact({ lastName: "Roux", firstName: "   ", restaurant: "Les Halles" }, repository)

    expect(repository.add).toHaveBeenCalledWith(expect.objectContaining({ firstName: null }))
  })

  it("démarre un nouveau contact à l'étape premier contact, pas encore client", async () => {
    const result = await addContact({ lastName: "Durand", restaurant: "Le Comptoir" }, createFakeRepository())

    expect(result).toMatchObject({
      ok: true,
      contact: { stage: "premier_contact", isClient: false, nextStage: "degustation" },
    })
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
    const contact = durand({ winesTasted: [MORGON] })

    expect(await getContact(DURAND_ID, createFakeRepository([contact]))).toEqual({
      ok: true,
      contact: shown(contact),
    })
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
  it("enregistre les vins cochés et le commentaire, puis les retrouve sur la fiche", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(
      DURAND_ID,
      { wineIds: [MORGON.id, CHABLIS.id], comment: "Rappeler en décembre", lastVisitDate: "" },
      NOW,
      repository,
    )

    expect(result.ok).toBe(true)
    expect(repository.update).toHaveBeenCalledWith(DURAND_ID, {
      wineIds: [MORGON.id, CHABLIS.id],
      comment: "Rappeler en décembre",
      lastVisitDate: null,
      interlocutor: null,
      channel: null,
    })
    expect(await getContact(DURAND_ID, repository)).toEqual({
      ok: true,
      contact: shown(durand({ winesTasted: [MORGON, CHABLIS], comment: "Rappeler en décembre" })),
    })
  })

  it("enlève les espaces autour des valeurs et transforme les champs vides en null", async () => {
    const repository = createFakeRepository([durand({ winesTasted: [MORGON], comment: "Bien" })])

    await updateContactDetails(DURAND_ID, { comment: "   " }, NOW, repository)

    expect(repository.update).toHaveBeenCalledWith(DURAND_ID, {
      wineIds: [],
      comment: null,
      lastVisitDate: null,
      interlocutor: null,
      channel: null,
    })
  })

  it("enregistre une date de visite passée", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(DURAND_ID, { lastVisitDate: "2026-11-12" }, NOW, repository)

    expect(result).toEqual({ ok: true, contact: shown(durand({ lastVisitDate: "2026-11-12" })) })
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

    const result = await updateContactDetails("abc", { comment: "Bien" }, NOW, repository)

    expect(result).toEqual({ ok: false, reason: "notFound" })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un UUID inconnu", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(
      "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      { comment: "Bien" },
      NOW,
      repository,
    )

    expect(result).toEqual({ ok: false, reason: "notFound" })
  })
})

describe("updateContactDetails · vins dégustés", () => {
  it("décoche tous les vins quand aucun n'est envoyé", async () => {
    const repository = createFakeRepository([durand({ winesTasted: [MORGON, CHABLIS] })])

    const result = await updateContactDetails(DURAND_ID, { wineIds: [] }, NOW, repository)

    expect(repository.update).toHaveBeenCalledWith(DURAND_ID, expect.objectContaining({ wineIds: [] }))
    expect(result).toMatchObject({ ok: true, contact: { winesTasted: [] } })
  })

  it("décoche un vin et garde l'autre", async () => {
    const repository = createFakeRepository([durand({ winesTasted: [MORGON, CHABLIS] })])

    const result = await updateContactDetails(DURAND_ID, { wineIds: [CHABLIS.id] }, NOW, repository)

    expect(result).toMatchObject({ ok: true, contact: { winesTasted: [CHABLIS] } })
  })

  it("n'enregistre qu'une fois un vin coché deux fois", async () => {
    const repository = createFakeRepository([durand()])

    await updateContactDetails(DURAND_ID, { wineIds: [MORGON.id, MORGON.id] }, NOW, repository)

    expect(repository.update).toHaveBeenCalledWith(DURAND_ID, expect.objectContaining({ wineIds: [MORGON.id] }))
  })

  it("refuse un vin coché dont l'identifiant est invalide, sans rien enregistrer", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(DURAND_ID, { wineIds: [MORGON.id, "abc"] }, NOW, repository)

    expect(result).toEqual({ ok: false, reason: "invalid", errors: { wineIds: "Un vin coché est invalide." } })
    expect(repository.update).not.toHaveBeenCalled()
  })
})

describe("updateContactDetails · interlocuteur et canal", () => {
  it("enregistre sommelier et par téléphone, puis les retrouve sur la fiche", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(
      DURAND_ID,
      { interlocutor: "sommelier", channel: "telephone" },
      NOW,
      repository,
    )

    expect(result.ok).toBe(true)
    expect(repository.update).toHaveBeenCalledWith(
      DURAND_ID,
      expect.objectContaining({ interlocutor: "sommelier", channel: "telephone" }),
    )
    expect(await getContact(DURAND_ID, repository)).toMatchObject({
      ok: true,
      contact: { interlocutor: "sommelier", channel: "telephone" },
    })
  })

  it("accepte patron et en personne", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(
      DURAND_ID,
      { interlocutor: "patron", channel: "en_personne" },
      NOW,
      repository,
    )

    expect(result).toMatchObject({ ok: true, contact: { interlocutor: "patron", channel: "en_personne" } })
  })

  it("refuse un interlocuteur ou un canal inconnu sans rien enregistrer", async () => {
    const repository = createFakeRepository([durand()])

    const result = await updateContactDetails(
      DURAND_ID,
      { interlocutor: "chef", channel: "courrier" },
      NOW,
      repository,
    )

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      errors: {
        interlocutor: "L'interlocuteur doit être le patron ou le sommelier.",
        channel: "Le canal doit être en personne ou par téléphone.",
      },
    })
    expect(repository.update).not.toHaveBeenCalled()
  })
})

describe("updateContactDetails · interlocuteur et canal à toutes les étapes", () => {
  it("enregistre patron et en personne pour un contact en dégustation", async () => {
    const repository = createFakeRepository([durand({ stage: "degustation" })])

    const result = await updateContactDetails(
      DURAND_ID,
      { interlocutor: "patron", channel: "en_personne" },
      NOW,
      repository,
    )

    expect(result).toMatchObject({
      ok: true,
      contact: { stage: "degustation", interlocutor: "patron", channel: "en_personne" },
    })
  })

  it("change l'interlocuteur et le canal d'un client", async () => {
    const repository = createFakeRepository([
      durand({ stage: "commande", interlocutor: "sommelier", channel: "telephone" }),
    ])

    const result = await updateContactDetails(
      DURAND_ID,
      { interlocutor: "patron", channel: "en_personne" },
      NOW,
      repository,
    )

    expect(result).toMatchObject({
      ok: true,
      contact: { isClient: true, interlocutor: "patron", channel: "en_personne" },
    })
  })

  it("efface un interlocuteur vidé", async () => {
    const repository = createFakeRepository([
      durand({ stage: "degustation", interlocutor: "sommelier", channel: "telephone" }),
    ])

    const result = await updateContactDetails(
      DURAND_ID,
      { interlocutor: "", channel: "telephone" },
      NOW,
      repository,
    )

    expect(result).toMatchObject({ ok: true, contact: { interlocutor: null, channel: "telephone" } })
  })
})

describe("advanceContactStage", () => {
  it("passe un contact de premier contact à dégustation", async () => {
    const repository = createFakeRepository([durand()])

    const result = await advanceContactStage(DURAND_ID, repository)

    expect(repository.changeStage).toHaveBeenCalledWith(DURAND_ID, "premier_contact", "degustation")
    expect(result).toEqual({ ok: true, contact: shown(durand({ stage: "degustation" })) })
    expect(result).toMatchObject({ contact: { isClient: false, nextStage: "commande" } })
    expect(await listContacts(repository)).toMatchObject([{ stage: "degustation" }])
  })

  it("passe un contact de dégustation à commande, et il devient client", async () => {
    const repository = createFakeRepository([durand({ stage: "degustation" })])

    const result = await advanceContactStage(DURAND_ID, repository)

    expect(repository.changeStage).toHaveBeenCalledWith(DURAND_ID, "degustation", "commande")
    expect(result).toMatchObject({ ok: true, contact: { stage: "commande", isClient: true, nextStage: null } })
  })

  it("ne propose plus d'étape suivante à un client et refuse de le faire avancer", async () => {
    const repository = createFakeRepository([durand({ stage: "commande" })])

    expect(await getContact(DURAND_ID, repository)).toMatchObject({ contact: { isClient: true, nextStage: null } })
    expect(await advanceContactStage(DURAND_ID, repository)).toEqual({ ok: false, reason: "lastStage" })
    expect(repository.changeStage).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un id qui n'est pas un UUID, sans interroger le repository", async () => {
    const repository = createFakeRepository([durand()])

    expect(await advanceContactStage("abc", repository)).toEqual({ ok: false, reason: "notFound" })
    expect(repository.findById).not.toHaveBeenCalled()
    expect(repository.changeStage).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un UUID inconnu", async () => {
    const repository = createFakeRepository([durand()])

    expect(await advanceContactStage("0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", repository)).toEqual({
      ok: false,
      reason: "notFound",
    })
  })

  it("ne saute pas d'étape si le contact a déjà avancé entre-temps", async () => {
    const repository = createFakeRepository([durand()])
    vi.mocked(repository.changeStage).mockResolvedValueOnce(null)

    expect(await advanceContactStage(DURAND_ID, repository)).toEqual({ ok: false, reason: "conflict" })
    expect(repository.changeStage).toHaveBeenCalledTimes(1)
  })
})

describe("revertContactStage", () => {
  it("ramène un contact de dégustation à premier contact", async () => {
    const repository = createFakeRepository([durand({ stage: "degustation" })])

    const result = await revertContactStage(DURAND_ID, repository)

    expect(repository.changeStage).toHaveBeenCalledWith(DURAND_ID, "degustation", "premier_contact")
    expect(result).toEqual({ ok: true, contact: shown(durand({ stage: "premier_contact" })) })
    expect(await listContacts(repository)).toMatchObject([{ stage: "premier_contact" }])
  })

  it("ramène un client en dégustation, et il n'est plus client", async () => {
    const repository = createFakeRepository([durand({ stage: "commande" })])

    const result = await revertContactStage(DURAND_ID, repository)

    expect(repository.changeStage).toHaveBeenCalledWith(DURAND_ID, "commande", "degustation")
    expect(result).toMatchObject({
      ok: true,
      contact: { stage: "degustation", isClient: false, nextStage: "commande", previousStage: "premier_contact" },
    })
  })

  it("ne propose pas d'étape précédente en premier contact et refuse de reculer", async () => {
    const repository = createFakeRepository([durand()])

    expect(await getContact(DURAND_ID, repository)).toMatchObject({ contact: { previousStage: null } })
    expect(await revertContactStage(DURAND_ID, repository)).toEqual({ ok: false, reason: "firstStage" })
    expect(repository.changeStage).not.toHaveBeenCalled()
  })

  it("garde interlocuteur, canal, vin, commentaire et date de visite", async () => {
    const details: Partial<StoredContact> = {
      winesTasted: [MORGON],
      comment: "Rappeler",
      lastVisitDate: "2026-11-12",
      interlocutor: "patron",
      channel: "en_personne",
    }
    const repository = createFakeRepository([durand({ stage: "commande", ...details })])

    const result = await revertContactStage(DURAND_ID, repository)

    expect(result).toEqual({ ok: true, contact: shown(durand({ stage: "degustation", ...details })) })
  })

  it("renvoie notFound pour un id qui n'est pas un UUID, sans interroger le repository", async () => {
    const repository = createFakeRepository([durand({ stage: "degustation" })])

    expect(await revertContactStage("abc", repository)).toEqual({ ok: false, reason: "notFound" })
    expect(repository.findById).not.toHaveBeenCalled()
    expect(repository.changeStage).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un UUID inconnu", async () => {
    const repository = createFakeRepository([durand({ stage: "degustation" })])

    expect(await revertContactStage("0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", repository)).toEqual({
      ok: false,
      reason: "notFound",
    })
  })

  it("ne recule que d'une étape quand deux onglets reculent en même temps", async () => {
    const repository = createFakeRepository([durand({ stage: "commande" })])

    const [first, second] = await Promise.all([
      revertContactStage(DURAND_ID, repository),
      revertContactStage(DURAND_ID, repository),
    ])

    expect([first, second]).toContainEqual({ ok: false, reason: "conflict" })
    expect(await getContact(DURAND_ID, repository)).toMatchObject({ contact: { stage: "degustation" } })
  })
})

describe("listContactsToFollowUp", () => {
  it("demande au repository les contacts sans visite depuis plus de 7 jours", async () => {
    const repository = createFakeRepository()

    await listContactsToFollowUp(NOW, repository)

    expect(repository.findWithoutVisitSince).toHaveBeenCalledWith("2026-11-17")
  })

  it("inclut une dernière visite il y a 8 jours", async () => {
    const repository = createFakeRepository([durand({ lastVisitDate: "2026-11-16" })])

    expect(await listContactsToFollowUp(NOW, repository)).toEqual([shown(durand({ lastVisitDate: "2026-11-16" }))])
  })

  it("exclut une dernière visite il y a exactement 7 jours", async () => {
    const repository = createFakeRepository([durand({ lastVisitDate: "2026-11-17" })])

    expect(await listContactsToFollowUp(NOW, repository)).toEqual([])
  })

  it("inclut un client sans visite depuis 10 jours", async () => {
    const client = durand({ stage: "commande", lastVisitDate: "2026-11-14" })

    expect(await listContactsToFollowUp(NOW, createFakeRepository([client]))).toMatchObject([
      { stage: "commande", isClient: true },
    ])
  })

  it("inclut un contact sans aucune date de visite", async () => {
    const repository = createFakeRepository([durand({ lastVisitDate: null })])

    expect(await listContactsToFollowUp(NOW, repository)).toHaveLength(1)
  })

  it("retire un contact dont la date de visite passe à aujourd'hui", async () => {
    const repository = createFakeRepository([durand({ lastVisitDate: "2026-11-01" })])
    expect(await listContactsToFollowUp(NOW, repository)).toHaveLength(1)

    await updateContactDetails(DURAND_ID, { lastVisitDate: "2026-11-24" }, NOW, repository)

    expect(await listContactsToFollowUp(NOW, repository)).toEqual([])
  })

  it("compte les jours à partir de la date du jour à Paris", async () => {
    const repository = createFakeRepository()
    const justAfterMidnightInParis = new Date("2026-11-24T23:30:00.000Z")

    await listContactsToFollowUp(justAfterMidnightInParis, repository)

    expect(repository.findWithoutVisitSince).toHaveBeenCalledWith("2026-11-18")
  })

  it("passe correctement d'un mois et d'une année à l'autre", async () => {
    const repository = createFakeRepository()

    await listContactsToFollowUp(new Date("2027-01-03T10:00:00.000Z"), repository)

    expect(repository.findWithoutVisitSince).toHaveBeenCalledWith("2026-12-27")
  })
})

describe("checkStorage", () => {
  it("échoue en production sans DATABASE_URL", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DATABASE_URL", "")

    expect(() => checkStorage()).toThrow("DATABASE_URL manquante")
  })
})
