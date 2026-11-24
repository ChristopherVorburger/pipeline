// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createClient } from "@libsql/client"
import { createSqliteContactRepository } from "@/data/contact-repository"

let dir: string
let url: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pipeline-test-"))
  url = `file:${join(dir, "test.db")}`
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("createSqliteContactRepository", () => {
  it("renvoie une liste vide sur une base neuve", async () => {
    const repository = createSqliteContactRepository(url)

    expect(await repository.findAll()).toEqual([])
    repository.close()
  })

  it("retrouve un contact ajouté", async () => {
    const repository = createSqliteContactRepository(url)

    const added = await repository.add({
      lastName: "Durand",
      firstName: null,
      restaurant: "Le Comptoir",
      stage: "premier_contact",
    })

    expect(added.id).toBeTruthy()
    expect(await repository.findAll()).toEqual([added])
    repository.close()
  })

  it("garde les contacts après réouverture de la base", async () => {
    const first = createSqliteContactRepository(url)
    const added = await first.add({ lastName: "Roux", firstName: "Camille", restaurant: "Les Halles", stage: "premier_contact" })
    first.close()

    const second = createSqliteContactRepository(url)

    expect(await second.findAll()).toEqual([added])
    second.close()
  })

  it("renvoie les contacts dans l'ordre d'ajout", async () => {
    const repository = createSqliteContactRepository(url)
    await repository.add({ lastName: "A", firstName: null, restaurant: "R1", stage: "premier_contact" })
    await repository.add({ lastName: "B", firstName: null, restaurant: "R2", stage: "premier_contact" })

    expect((await repository.findAll()).map((c) => c.lastName)).toEqual(["A", "B"])
    repository.close()
  })

  it("stocke les apostrophes telles quelles", async () => {
    const repository = createSqliteContactRepository(url)
    await repository.add({ lastName: "O'Brien", firstName: null, restaurant: "L'Ami Jean", stage: "premier_contact" })

    const [contact] = await repository.findAll()
    expect(contact.lastName).toBe("O'Brien")
    expect(contact.restaurant).toBe("L'Ami Jean")
    repository.close()
  })

  it("crée un contact sans vin, commentaire ni date de visite", async () => {
    const repository = createSqliteContactRepository(url)

    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "premier_contact" })

    expect(added).toMatchObject({
      wineTasted: null,
      comment: null,
      lastVisitDate: null,
      stage: "premier_contact",
      interlocutor: null,
      channel: null,
    })
    repository.close()
  })

  it("retrouve un contact par son id", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "premier_contact" })

    expect(await repository.findById(added.id)).toEqual(added)
    repository.close()
  })

  it("renvoie null pour un id inconnu", async () => {
    const repository = createSqliteContactRepository(url)

    expect(await repository.findById(crypto.randomUUID())).toBeNull()
    repository.close()
  })

  it("met à jour vin, commentaire et date de visite, puis les retrouve", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "premier_contact" })

    const updated = await repository.update(added.id, {
      wineTasted: "Chablis 2022",
      comment: "Rappeler pour l'ardoise d'hiver",
      lastVisitDate: "2026-11-12",
      interlocutor: "sommelier",
      channel: "telephone",
    })

    const expected = {
      ...added,
      wineTasted: "Chablis 2022",
      comment: "Rappeler pour l'ardoise d'hiver",
      lastVisitDate: "2026-11-12",
      interlocutor: "sommelier",
      channel: "telephone",
    }
    expect(updated).toEqual(expected)
    expect(await repository.findById(added.id)).toEqual(expected)
    expect(await repository.findAll()).toEqual([expected])
    repository.close()
  })

  it("efface les valeurs mises à null", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "premier_contact" })
    await repository.update(added.id, {
      wineTasted: "Chablis",
      comment: "Bien",
      lastVisitDate: "2026-11-12",
      interlocutor: "patron",
      channel: "en_personne",
    })

    await repository.update(added.id, {
      wineTasted: null,
      comment: null,
      lastVisitDate: null,
      interlocutor: null,
      channel: null,
    })

    expect(await repository.findById(added.id)).toMatchObject({
      wineTasted: null,
      comment: null,
      lastVisitDate: null,
      interlocutor: null,
      channel: null,
    })
    repository.close()
  })

  it("ne touche à rien et renvoie null pour la mise à jour d'un id inconnu", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "premier_contact" })

    const result = await repository.update(crypto.randomUUID(), {
      wineTasted: "Chablis",
      comment: null,
      lastVisitDate: null,
      interlocutor: null,
      channel: null,
    })

    expect(result).toBeNull()
    expect(await repository.findAll()).toEqual([added])
    repository.close()
  })

  it("garde les modifications après réouverture de la base", async () => {
    const first = createSqliteContactRepository(url)
    const added = await first.add({ lastName: "Roux", firstName: "Camille", restaurant: "Les Halles", stage: "premier_contact" })
    const updated = await first.update(added.id, {
      wineTasted: "Morgon",
      comment: "Sommelier intéressé",
      lastVisitDate: "2026-11-12",
      interlocutor: "sommelier",
      channel: "telephone",
    })
    first.close()

    const second = createSqliteContactRepository(url)

    expect(await second.findById(added.id)).toEqual(updated)
    expect(await second.findAll()).toEqual([updated])
    second.close()
  })

  it("migre une base à l'ancien schéma sans perdre les contacts", async () => {
    const legacy = createClient({ url })
    await legacy.execute(
      "CREATE TABLE contacts (id TEXT PRIMARY KEY, last_name TEXT NOT NULL, first_name TEXT, restaurant TEXT NOT NULL, created_at TEXT NOT NULL)",
    )
    await legacy.execute({
      sql: "INSERT INTO contacts (id, last_name, first_name, restaurant, created_at) VALUES (?, ?, ?, ?, ?)",
      args: ["11111111-1111-4111-8111-111111111111", "Durand", null, "Le Comptoir", "2026-11-20T10:00:00.000Z"],
    })
    legacy.close()

    const repository = createSqliteContactRepository(url)

    expect(await repository.findAll()).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        lastName: "Durand",
        firstName: null,
        restaurant: "Le Comptoir",
        wineTasted: null,
        comment: null,
        lastVisitDate: null,
        stage: "premier_contact",
        interlocutor: null,
        channel: null,
        createdAt: "2026-11-20T10:00:00.000Z",
      },
    ])
    const updated = await repository.update("11111111-1111-4111-8111-111111111111", {
      wineTasted: "Chablis",
      comment: null,
      lastVisitDate: "2026-11-12",
      interlocutor: null,
      channel: null,
    })
    expect(updated?.lastVisitDate).toBe("2026-11-12")
    repository.close()
  })

  it("enregistre l'étape donnée à la création", async () => {
    const repository = createSqliteContactRepository(url)

    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "degustation" })

    expect(added.stage).toBe("degustation")
    expect(await repository.findById(added.id)).toMatchObject({ stage: "degustation" })
    repository.close()
  })

  it("change l'étape quand l'étape actuelle est celle attendue, y compris après réouverture", async () => {
    const first = createSqliteContactRepository(url)
    const added = await first.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "premier_contact" })

    const advanced = await first.changeStage(added.id, "premier_contact", "degustation")
    first.close()

    expect(advanced).toEqual({ ...added, stage: "degustation" })
    const second = createSqliteContactRepository(url)
    expect(await second.findAll()).toEqual([{ ...added, stage: "degustation" }])
    second.close()
  })

  it("ne change pas l'étape si l'étape actuelle n'est pas celle attendue", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "degustation" })

    const result = await repository.changeStage(added.id, "premier_contact", "degustation")

    expect(result).toBeNull()
    expect(await repository.findById(added.id)).toMatchObject({ stage: "degustation" })
    repository.close()
  })

  it("ramène l'étape en arrière sans toucher au reste de la fiche, y compris après réouverture", async () => {
    const first = createSqliteContactRepository(url)
    const added = await first.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "commande" })
    const details = {
      wineTasted: "Chablis",
      comment: "Rappeler",
      lastVisitDate: "2026-11-12",
      interlocutor: "patron",
      channel: "en_personne",
    } as const
    await first.update(added.id, details)

    const reverted = await first.changeStage(added.id, "commande", "degustation")
    first.close()

    expect(reverted).toEqual({ ...added, ...details, stage: "degustation" })
    const second = createSqliteContactRepository(url)
    expect(await second.findById(added.id)).toEqual({ ...added, ...details, stage: "degustation" })
    second.close()
  })

  it("renvoie null pour le changement d'étape d'un id inconnu", async () => {
    const repository = createSqliteContactRepository(url)

    expect(await repository.changeStage(crypto.randomUUID(), "premier_contact", "degustation")).toBeNull()
    repository.close()
  })

  it("migre une base du lot 2 en plaçant les contacts existants en premier contact", async () => {
    const legacy = createClient({ url })
    await legacy.execute(
      "CREATE TABLE contacts (id TEXT PRIMARY KEY, last_name TEXT NOT NULL, first_name TEXT, restaurant TEXT NOT NULL, created_at TEXT NOT NULL, wine_tasted TEXT, comment TEXT, last_visit_date TEXT)",
    )
    await legacy.execute({
      sql: "INSERT INTO contacts (id, last_name, first_name, restaurant, created_at, last_visit_date) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["22222222-2222-4222-8222-222222222222", "Roux", "Camille", "Les Halles", "2026-11-21T10:00:00.000Z", "2026-11-12"],
    })
    legacy.close()

    const repository = createSqliteContactRepository(url)

    expect(await repository.findAll()).toEqual([
      expect.objectContaining({
        id: "22222222-2222-4222-8222-222222222222",
        lastVisitDate: "2026-11-12",
        stage: "premier_contact",
        interlocutor: null,
        channel: null,
      }),
    ])
    repository.close()
  })

  describe("findWithoutVisitSince", () => {
    async function seed(lastVisits: Record<string, string | null>) {
      const repository = createSqliteContactRepository(url)
      for (const [lastName, lastVisitDate] of Object.entries(lastVisits)) {
        const added = await repository.add({ lastName, firstName: null, restaurant: "R", stage: "premier_contact" })
        await repository.update(added.id, {
          wineTasted: null,
          comment: null,
          lastVisitDate,
          interlocutor: null,
          channel: null,
        })
      }
      return repository
    }

    it("renvoie les contacts dont la dernière visite est strictement avant la date limite", async () => {
      const repository = await seed({ Avant: "2026-11-16", Limite: "2026-11-17", Apres: "2026-11-20" })

      const contacts = await repository.findWithoutVisitSince("2026-11-17")

      expect(contacts.map((c) => c.lastName)).toEqual(["Avant"])
      repository.close()
    })

    it("renvoie les contacts sans aucune date de visite", async () => {
      const repository = await seed({ Jamais: null, Recent: "2026-11-20" })

      const contacts = await repository.findWithoutVisitSince("2026-11-17")

      expect(contacts.map((c) => c.lastName)).toEqual(["Jamais"])
      repository.close()
    })

    it("renvoie les contacts à toutes les étapes", async () => {
      const repository = createSqliteContactRepository(url)
      await repository.add({ lastName: "Client", firstName: null, restaurant: "R", stage: "commande" })

      expect(await repository.findWithoutVisitSince("2026-11-17")).toMatchObject([
        { lastName: "Client", stage: "commande" },
      ])
      repository.close()
    })

    it("met d'abord les contacts jamais visités, puis les visites les plus anciennes", async () => {
      const repository = await seed({ Recente: "2026-11-10", Jamais: null, Ancienne: "2026-10-01" })

      const contacts = await repository.findWithoutVisitSince("2026-11-17")

      expect(contacts.map((c) => c.lastName)).toEqual(["Jamais", "Ancienne", "Recente"])
      repository.close()
    })

    it("ne traite pas la date limite comme du SQL", async () => {
      const repository = await seed({ Durand: "2026-11-20" })

      expect(await repository.findWithoutVisitSince("' OR 1=1 --")).toEqual([])
      repository.close()
    })
  })

  it("supporte plusieurs instances qui migrent la même base en même temps", async () => {
    const legacy = createClient({ url })
    await legacy.execute(
      "CREATE TABLE contacts (id TEXT PRIMARY KEY, last_name TEXT NOT NULL, first_name TEXT, restaurant TEXT NOT NULL, created_at TEXT NOT NULL)",
    )
    legacy.close()
    const instances = Array.from({ length: 5 }, () => createSqliteContactRepository(url))

    const results = await Promise.allSettled(instances.map((instance) => instance.findAll()))

    expect(results.map((result) => result.status)).toEqual(Array(5).fill("fulfilled"))
    instances.forEach((instance) => instance.close())
  })

  it("retente la migration au prochain appel si elle a échoué", async () => {
    const blocker = createClient({ url })
    await blocker.execute("CREATE VIEW contacts AS SELECT 1 AS id")
    const repository = createSqliteContactRepository(url)

    await expect(repository.findAll()).rejects.toThrow()
    await blocker.execute("DROP VIEW contacts")
    blocker.close()

    expect(await repository.findAll()).toEqual([])
    repository.close()
  })
})
