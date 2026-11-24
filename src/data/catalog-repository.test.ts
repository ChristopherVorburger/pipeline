// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createSqliteCatalogRepository } from "@/data/catalog-repository"

let dir: string
let url: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pipeline-catalog-test-"))
  url = `file:${join(dir, "test.db")}`
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("createSqliteCatalogRepository", () => {
  it("renvoie un catalogue vide sur une base neuve", async () => {
    const repository = createSqliteCatalogRepository(url)

    expect(await repository.findAll()).toEqual([])
    repository.close()
  })

  it("garde un domaine ajouté après réouverture de la base", async () => {
    const first = createSqliteCatalogRepository(url)
    const domain = await first.addDomain("Domaine Dupont")
    first.close()

    expect(domain).toMatchObject({ name: "Domaine Dupont" })
    const second = createSqliteCatalogRepository(url)
    expect(await second.findAll()).toEqual([{ ...domain, wines: [] }])
    second.close()
  })

  it("range un vin sous son domaine, y compris après réouverture", async () => {
    const first = createSqliteCatalogRepository(url)
    const dupont = await first.addDomain("Domaine Dupont")
    const roux = await first.addDomain("Château Roux")
    const wine = await first.addWine(roux!.id, "Morgon 2022")
    first.close()

    expect(wine).toMatchObject({ domainId: roux!.id, name: "Morgon 2022" })
    const second = createSqliteCatalogRepository(url)
    expect(await second.findAll()).toEqual([
      { ...roux, wines: [wine] },
      { ...dupont, wines: [] },
    ])
    second.close()
  })

  it("trie les domaines et les vins par nom, sans tenir compte de la casse", async () => {
    const repository = createSqliteCatalogRepository(url)
    const b = await repository.addDomain("beaujolais")
    await repository.addDomain("Alsace")
    await repository.addWine(b!.id, "Régnié")
    await repository.addWine(b!.id, "fleurie")

    const catalog = await repository.findAll()

    expect(catalog.map((d) => d.name)).toEqual(["Alsace", "beaujolais"])
    expect(catalog[1].wines.map((w) => w.name)).toEqual(["fleurie", "Régnié"])
    repository.close()
  })

  it("refuse un domaine qui existe déjà, sans tenir compte de la casse", async () => {
    const repository = createSqliteCatalogRepository(url)
    await repository.addDomain("Domaine Dupont")

    expect(await repository.addDomain("domaine dupont")).toBeNull()
    expect(await repository.findAll()).toHaveLength(1)
    repository.close()
  })

  it("refuse un vin qui existe déjà dans le domaine, mais l'accepte dans un autre", async () => {
    const repository = createSqliteCatalogRepository(url)
    const dupont = await repository.addDomain("Domaine Dupont")
    const roux = await repository.addDomain("Château Roux")
    await repository.addWine(dupont!.id, "Chablis")

    expect(await repository.addWine(dupont!.id, "CHABLIS")).toBeNull()
    expect(await repository.addWine(roux!.id, "Chablis")).toMatchObject({ domainId: roux!.id })
    repository.close()
  })

  it("retrouve un domaine par son id, et renvoie null pour un id inconnu", async () => {
    const repository = createSqliteCatalogRepository(url)
    const domain = await repository.addDomain("Domaine Dupont")

    expect(await repository.findDomainById(domain!.id)).toEqual(domain)
    expect(await repository.findDomainById(crypto.randomUUID())).toBeNull()
    repository.close()
  })

  it("stocke les apostrophes telles quelles", async () => {
    const repository = createSqliteCatalogRepository(url)
    const domain = await repository.addDomain("Domaine de l'Arlot")
    await repository.addWine(domain!.id, "Nuits-Saint-Georges 'Clos'")

    const [stored] = await repository.findAll()
    expect(stored.name).toBe("Domaine de l'Arlot")
    expect(stored.wines[0].name).toBe("Nuits-Saint-Georges 'Clos'")
    repository.close()
  })
})
