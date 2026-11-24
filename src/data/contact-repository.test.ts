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
    })

    expect(added.id).toBeTruthy()
    expect(await repository.findAll()).toEqual([added])
    repository.close()
  })

  it("garde les contacts après réouverture de la base", async () => {
    const first = createSqliteContactRepository(url)
    const added = await first.add({ lastName: "Roux", firstName: "Camille", restaurant: "Les Halles" })
    first.close()

    const second = createSqliteContactRepository(url)

    expect(await second.findAll()).toEqual([added])
    second.close()
  })

  it("renvoie les contacts dans l'ordre d'ajout", async () => {
    const repository = createSqliteContactRepository(url)
    await repository.add({ lastName: "A", firstName: null, restaurant: "R1" })
    await repository.add({ lastName: "B", firstName: null, restaurant: "R2" })

    expect((await repository.findAll()).map((c) => c.lastName)).toEqual(["A", "B"])
    repository.close()
  })

  it("stocke les apostrophes telles quelles", async () => {
    const repository = createSqliteContactRepository(url)
    await repository.add({ lastName: "O'Brien", firstName: null, restaurant: "L'Ami Jean" })

    const [contact] = await repository.findAll()
    expect(contact.lastName).toBe("O'Brien")
    expect(contact.restaurant).toBe("L'Ami Jean")
    repository.close()
  })

  it("crée un contact sans vin, commentaire ni date de visite", async () => {
    const repository = createSqliteContactRepository(url)

    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir" })

    expect(added).toMatchObject({ wineTasted: null, comment: null, lastVisitDate: null })
    repository.close()
  })

  it("retrouve un contact par son id", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir" })

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
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir" })

    const updated = await repository.update(added.id, {
      wineTasted: "Chablis 2022",
      comment: "Rappeler pour l'ardoise d'hiver",
      lastVisitDate: "2026-11-12",
    })

    const expected = {
      ...added,
      wineTasted: "Chablis 2022",
      comment: "Rappeler pour l'ardoise d'hiver",
      lastVisitDate: "2026-11-12",
    }
    expect(updated).toEqual(expected)
    expect(await repository.findById(added.id)).toEqual(expected)
    expect(await repository.findAll()).toEqual([expected])
    repository.close()
  })

  it("efface les valeurs mises à null", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir" })
    await repository.update(added.id, { wineTasted: "Chablis", comment: "Bien", lastVisitDate: "2026-11-12" })

    await repository.update(added.id, { wineTasted: null, comment: null, lastVisitDate: null })

    expect(await repository.findById(added.id)).toMatchObject({
      wineTasted: null,
      comment: null,
      lastVisitDate: null,
    })
    repository.close()
  })

  it("ne touche à rien et renvoie null pour la mise à jour d'un id inconnu", async () => {
    const repository = createSqliteContactRepository(url)
    const added = await repository.add({ lastName: "Durand", firstName: null, restaurant: "Le Comptoir" })

    const result = await repository.update(crypto.randomUUID(), {
      wineTasted: "Chablis",
      comment: null,
      lastVisitDate: null,
    })

    expect(result).toBeNull()
    expect(await repository.findAll()).toEqual([added])
    repository.close()
  })

  it("garde les modifications après réouverture de la base", async () => {
    const first = createSqliteContactRepository(url)
    const added = await first.add({ lastName: "Roux", firstName: "Camille", restaurant: "Les Halles" })
    const updated = await first.update(added.id, {
      wineTasted: "Morgon",
      comment: "Sommelier intéressé",
      lastVisitDate: "2026-11-12",
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
        createdAt: "2026-11-20T10:00:00.000Z",
      },
    ])
    const updated = await repository.update("11111111-1111-4111-8111-111111111111", {
      wineTasted: "Chablis",
      comment: null,
      lastVisitDate: "2026-11-12",
    })
    expect(updated?.lastVisitDate).toBe("2026-11-12")
    repository.close()
  })
})
