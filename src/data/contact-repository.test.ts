// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createClient } from "@libsql/client"
import { createSqliteCatalogRepository } from "@/data/catalog-repository"
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

async function seedWine(domainName: string, wineName: string) {
  const catalog = createSqliteCatalogRepository(url)
  const existing = (await catalog.findAll()).find((d) => d.name === domainName)
  const domain = existing ?? (await catalog.addDomain(domainName))
  const wine = await catalog.addWine(domain!.id, wineName)
  catalog.close()
  return { id: wine!.id, name: wineName, domainName }
}

async function legacyContact(wineTasted: string | null, comment: string | null) {
  const legacy = createClient({ url })
  await legacy.execute(
    "CREATE TABLE contacts (id TEXT PRIMARY KEY, last_name TEXT NOT NULL, first_name TEXT, restaurant TEXT NOT NULL, created_at TEXT NOT NULL, wine_tasted TEXT, comment TEXT, last_visit_date TEXT, stage TEXT NOT NULL DEFAULT 'premier_contact', interlocutor TEXT, channel TEXT)",
  )
  await legacy.execute({
    sql: "INSERT INTO contacts (id, last_name, restaurant, created_at, wine_tasted, comment) VALUES (?, ?, ?, ?, ?, ?)",
    args: ["33333333-3333-4333-8333-333333333333", "Durand", "Le Comptoir", "2026-11-20T10:00:00.000Z", wineTasted, comment],
  })
  legacy.close()
}

const LEGACY_ID = "33333333-3333-4333-8333-333333333333"

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
      winesTasted: [],
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
      wineIds: [],
      comment: "Rappeler pour l'ardoise d'hiver",
      lastVisitDate: "2026-11-12",
      interlocutor: "sommelier",
      channel: "telephone",
    })

    const expected = {
      ...added,
      winesTasted: [],
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
      wineIds: [],
      comment: "Bien",
      lastVisitDate: "2026-11-12",
      interlocutor: "patron",
      channel: "en_personne",
    })

    await repository.update(added.id, {
      wineIds: [],
      comment: null,
      lastVisitDate: null,
      interlocutor: null,
      channel: null,
    })

    expect(await repository.findById(added.id)).toMatchObject({
      winesTasted: [],
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
      wineIds: [],
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
      wineIds: [],
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
        winesTasted: [],
        comment: null,
        lastVisitDate: null,
        stage: "premier_contact",
        interlocutor: null,
        channel: null,
        createdAt: "2026-11-20T10:00:00.000Z",
      },
    ])
    const updated = await repository.update("11111111-1111-4111-8111-111111111111", {
      wineIds: [],
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
    const wine = await seedWine("Château Roux", "Morgon 2022")
    const first = createSqliteContactRepository(url)
    const added = await first.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "commande" })
    const updated = await first.update(added.id, {
      wineIds: [wine.id],
      comment: "Rappeler",
      lastVisitDate: "2026-11-12",
      interlocutor: "patron",
      channel: "en_personne",
    })

    const reverted = await first.changeStage(added.id, "commande", "degustation")
    first.close()

    expect(reverted).toEqual({ ...updated, stage: "degustation" })
    const second = createSqliteContactRepository(url)
    expect(await second.findById(added.id)).toEqual({ ...updated, stage: "degustation" })
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

  describe("vins dégustés", () => {
    const details = { comment: null, lastVisitDate: null, interlocutor: null, channel: null }

    it("enregistre les vins cochés avec leur domaine, triés par domaine puis par vin, y compris après réouverture", async () => {
      const morgon = await seedWine("Château Roux", "Morgon 2022")
      const chablis = await seedWine("Domaine Dupont", "Chablis 2023")
      const fleurie = await seedWine("Château Roux", "Fleurie 2023")
      const first = createSqliteContactRepository(url)
      const added = await first.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "degustation" })

      const updated = await first.update(added.id, { ...details, wineIds: [chablis.id, morgon.id, fleurie.id] })
      first.close()

      expect(updated?.winesTasted).toEqual([fleurie, morgon, chablis])
      const second = createSqliteContactRepository(url)
      expect(await second.findById(added.id)).toEqual(updated)
      expect(await second.findAll()).toEqual([updated])
      second.close()
    })

    it("remplace les vins cochés à chaque mise à jour", async () => {
      const morgon = await seedWine("Château Roux", "Morgon 2022")
      const chablis = await seedWine("Domaine Dupont", "Chablis 2023")
      const repository = createSqliteContactRepository(url)
      const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir", stage: "degustation" })
      await repository.update(added.id, { ...details, wineIds: [morgon.id, chablis.id] })

      await repository.update(added.id, { ...details, wineIds: [chablis.id] })

      expect((await repository.findById(added.id))?.winesTasted).toEqual([chablis])
      repository.close()
    })

    it("garde les vins de chaque contact séparés", async () => {
      const morgon = await seedWine("Château Roux", "Morgon 2022")
      const chablis = await seedWine("Domaine Dupont", "Chablis 2023")
      const repository = createSqliteContactRepository(url)
      const durand = await repository.add({ lastName: "Durand", firstName: null, restaurant: "R1", stage: "degustation" })
      const roux = await repository.add({ lastName: "Roux", firstName: null, restaurant: "R2", stage: "degustation" })
      await repository.update(durand.id, { ...details, wineIds: [morgon.id] })
      await repository.update(roux.id, { ...details, wineIds: [chablis.id] })

      expect((await repository.findAll()).map((c) => c.winesTasted)).toEqual([[morgon], [chablis]])
      expect((await repository.findWithoutVisitSince("2026-11-17")).map((c) => c.winesTasted)).toEqual([
        [morgon],
        [chablis],
      ])
      repository.close()
    })

    it("ignore un vin qui n'est pas dans le catalogue", async () => {
      const morgon = await seedWine("Château Roux", "Morgon 2022")
      const repository = createSqliteContactRepository(url)
      const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "R", stage: "degustation" })

      const updated = await repository.update(added.id, { ...details, wineIds: [morgon.id, crypto.randomUUID()] })

      expect(updated?.winesTasted).toEqual([morgon])
      repository.close()
    })

    it("ne coche aucun vin pour la mise à jour d'un id inconnu", async () => {
      const morgon = await seedWine("Château Roux", "Morgon 2022")
      const repository = createSqliteContactRepository(url)

      expect(await repository.update(crypto.randomUUID(), { ...details, wineIds: [morgon.id] })).toBeNull()
      const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "R", stage: "degustation" })
      expect((await repository.findById(added.id))?.winesTasted).toEqual([])
      repository.close()
    })
  })

  describe("migration de l'ancien vin dégusté", () => {
    it("recopie l'ancien vin sur une nouvelle ligne à la fin du commentaire", async () => {
      await legacyContact("Morgon 2022", "Rappeler lundi")

      const repository = createSqliteContactRepository(url)

      expect(await repository.findById(LEGACY_ID)).toMatchObject({
        comment: "Rappeler lundi\nVin dégusté : Morgon 2022",
        winesTasted: [],
      })
      repository.close()
    })

    it("met l'ancien vin seul dans un commentaire vide", async () => {
      for (const comment of [null, ""]) {
        rmSync(dir, { recursive: true, force: true })
        dir = mkdtempSync(join(tmpdir(), "pipeline-test-"))
        url = `file:${join(dir, "test.db")}`
        await legacyContact("Morgon 2022", comment)

        const repository = createSqliteContactRepository(url)

        expect(await repository.findById(LEGACY_ID)).toMatchObject({ comment: "Vin dégusté : Morgon 2022" })
        repository.close()
      }
    })

    it("ne recopie pas l'ancien vin une seconde fois au redémarrage suivant", async () => {
      await legacyContact("Morgon 2022", "Rappeler lundi")
      createSqliteContactRepository(url).close()
      const first = createSqliteContactRepository(url)
      await first.findAll()
      first.close()

      const second = createSqliteContactRepository(url)

      expect(await second.findById(LEGACY_ID)).toMatchObject({ comment: "Rappeler lundi\nVin dégusté : Morgon 2022" })
      second.close()
    })

    it("ne touche pas au commentaire quand l'ancien vin est vide", async () => {
      await legacyContact("  ", "Rappeler lundi")

      const repository = createSqliteContactRepository(url)

      expect(await repository.findById(LEGACY_ID)).toMatchObject({ comment: "Rappeler lundi" })
      repository.close()
    })

    it("recopie une seule fois quand plusieurs instances démarrent en même temps", async () => {
      await legacyContact("Morgon 2022", "Rappeler lundi")
      const instances = Array.from({ length: 5 }, () => createSqliteContactRepository(url))

      const results = await Promise.allSettled(instances.map((instance) => instance.findById(LEGACY_ID)))

      expect(results.map((result) => result.status)).toEqual(Array(5).fill("fulfilled"))
      const check = createSqliteContactRepository(url)
      expect(await check.findById(LEGACY_ID)).toMatchObject({ comment: "Rappeler lundi\nVin dégusté : Morgon 2022" })
      instances.forEach((instance) => instance.close())
      check.close()
    })
  })

  describe("findWithoutVisitSince", () => {
    async function seed(lastVisits: Record<string, string | null>) {
      const repository = createSqliteContactRepository(url)
      for (const [lastName, lastVisitDate] of Object.entries(lastVisits)) {
        const added = await repository.add({ lastName, firstName: null, restaurant: "R", stage: "premier_contact" })
        await repository.update(added.id, {
          wineIds: [],
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
