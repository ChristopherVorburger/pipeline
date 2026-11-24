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

  describe("doublons sans accents, sans casse ni espaces en trop", () => {
    const variants = ["CHÂTEAU MARGAUX", "Chateau Margaux", "  château   margaux  ", "Château\tMargaux"]

    it("refuse un domaine qui ne diffère que par les accents, la casse ou les espaces", async () => {
      const repository = createSqliteCatalogRepository(url)
      await repository.addDomain("Château Margaux")

      for (const name of variants) {
        expect(await repository.addDomain(name)).toBeNull()
      }
      expect((await repository.findAll()).map((d) => d.name)).toEqual(["Château Margaux"])
      repository.close()
    })

    it("refuse un vin qui ne diffère que par les accents, la casse ou les espaces dans le même domaine", async () => {
      const repository = createSqliteCatalogRepository(url)
      const margaux = await repository.addDomain("Château Margaux")
      const roux = await repository.addDomain("Château Roux")
      await repository.addWine(margaux!.id, "Pavillon Rouge")

      for (const name of ["PAVILLON ROUGE", "Pavillon  rouge", "Pâvillon Rouge"]) {
        expect(await repository.addWine(margaux!.id, name)).toBeNull()
      }
      expect(await repository.addWine(roux!.id, "Pavillon rouge")).toMatchObject({ name: "Pavillon rouge" })
      repository.close()
    })

    it("garde le nom tel que saisi pour l'affichage", async () => {
      const repository = createSqliteCatalogRepository(url)
      const domain = await repository.addDomain("Château  d'Yquem")
      await repository.addWine(domain!.id, "Sauternes 1er Cru")

      expect(await repository.findAll()).toMatchObject([
        { name: "Château  d'Yquem", wines: [{ name: "Sauternes 1er Cru" }] },
      ])
      repository.close()
    })

    it("trie sans tenir compte des accents", async () => {
      const repository = createSqliteCatalogRepository(url)
      await repository.addDomain("Chinon")
      await repository.addDomain("Château Roux")
      await repository.addDomain("Cave")

      expect((await repository.findAll()).map((d) => d.name)).toEqual(["Cave", "Château Roux", "Chinon"])
      repository.close()
    })
  })

  describe("migration d'un catalogue du lot 7", () => {
    const CREATED = ["2026-11-20T10:00:00.000Z", "2026-11-21T10:00:00.000Z"]
    const DOMAIN_1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    const DOMAIN_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    const WINE_1 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
    const WINE_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    const WINE_3 = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    const CONTACT = "ffffffff-ffff-4fff-8fff-ffffffffffff"

    async function lot7Catalog() {
      const legacy = createClient({ url })
      await legacy.batch(
        [
          "CREATE TABLE contacts (id TEXT PRIMARY KEY, last_name TEXT NOT NULL, first_name TEXT, restaurant TEXT NOT NULL, created_at TEXT NOT NULL, comment TEXT, last_visit_date TEXT, stage TEXT NOT NULL DEFAULT 'premier_contact', interlocutor TEXT, channel TEXT)",
          "CREATE TABLE domains (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, created_at TEXT NOT NULL)",
          "CREATE TABLE wines (id TEXT PRIMARY KEY, domain_id TEXT NOT NULL REFERENCES domains(id), name TEXT NOT NULL COLLATE NOCASE, created_at TEXT NOT NULL, UNIQUE (domain_id, name))",
          "CREATE TABLE contact_wines (contact_id TEXT NOT NULL REFERENCES contacts(id), wine_id TEXT NOT NULL REFERENCES wines(id), PRIMARY KEY (contact_id, wine_id))",
          { sql: "INSERT INTO domains VALUES (?, ?, ?)", args: [DOMAIN_1, "Château Margaux", CREATED[0]] },
          { sql: "INSERT INTO domains VALUES (?, ?, ?)", args: [DOMAIN_2, "Chateau  Margaux", CREATED[1]] },
          { sql: "INSERT INTO wines VALUES (?, ?, ?, ?)", args: [WINE_1, DOMAIN_1, "Pavillon Rouge", CREATED[0]] },
          { sql: "INSERT INTO wines VALUES (?, ?, ?, ?)", args: [WINE_2, DOMAIN_2, "Pavillon rouge", CREATED[1]] },
          { sql: "INSERT INTO wines VALUES (?, ?, ?, ?)", args: [WINE_3, DOMAIN_2, "Pavillon Blanc", CREATED[1]] },
          {
            sql: "INSERT INTO contacts (id, last_name, restaurant, created_at) VALUES (?, ?, ?, ?)",
            args: [CONTACT, "Durand", "Le Comptoir", CREATED[0]],
          },
          { sql: "INSERT INTO contact_wines VALUES (?, ?)", args: [CONTACT, WINE_2] },
          { sql: "INSERT INTO contact_wines VALUES (?, ?)", args: [CONTACT, WINE_3] },
        ],
        "write",
      )
      legacy.close()
    }

    it("fusionne les domaines et les vins en double dans le plus ancien, sans perdre les vins cochés", async () => {
      await lot7Catalog()

      const catalog = createSqliteCatalogRepository(url)
      const contacts = createSqliteContactRepository(url)

      expect(await catalog.findAll()).toEqual([
        {
          id: DOMAIN_1,
          name: "Château Margaux",
          createdAt: CREATED[0],
          wines: [
            { id: WINE_3, domainId: DOMAIN_1, name: "Pavillon Blanc", createdAt: CREATED[1] },
            { id: WINE_1, domainId: DOMAIN_1, name: "Pavillon Rouge", createdAt: CREATED[0] },
          ],
        },
      ])
      expect((await contacts.findById(CONTACT))?.winesTasted).toEqual([
        { id: WINE_3, name: "Pavillon Blanc", domainName: "Château Margaux" },
        { id: WINE_1, name: "Pavillon Rouge", domainName: "Château Margaux" },
      ])
      catalog.close()
      contacts.close()
    })

    it("bloque ensuite les doublons normalisés, y compris après réouverture", async () => {
      await lot7Catalog()
      const first = createSqliteCatalogRepository(url)
      await first.findAll()
      first.close()

      const second = createSqliteCatalogRepository(url)

      expect(await second.addDomain("CHATEAU MARGAUX")).toBeNull()
      expect(await second.addWine(DOMAIN_1, "pavillon blanc")).toBeNull()
      expect(await second.findAll()).toHaveLength(1)
      second.close()
    })

    it("migre une seule fois quand plusieurs instances démarrent en même temps", async () => {
      await lot7Catalog()
      const instances = Array.from({ length: 5 }, () => createSqliteCatalogRepository(url))

      const results = await Promise.allSettled(instances.map((instance) => instance.findAll()))

      expect(results.map((result) => result.status)).toEqual(Array(5).fill("fulfilled"))
      const check = createSqliteCatalogRepository(url)
      expect((await check.findAll()).flatMap((d) => d.wines.map((w) => w.name))).toEqual([
        "Pavillon Blanc",
        "Pavillon Rouge",
      ])
      instances.forEach((instance) => instance.close())
      check.close()
    })
  })
})
