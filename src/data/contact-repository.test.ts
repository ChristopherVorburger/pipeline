// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
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
})
