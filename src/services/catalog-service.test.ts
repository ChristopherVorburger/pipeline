import { describe, expect, it, vi } from "vitest"
import type { CatalogRepository, StoredDomain, StoredWine } from "@/data/catalog-repository"
import { addDomain, addWine, listCatalog } from "@/services/catalog-service"

const DOMAIN_ID = "6a1f0c2e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"

function createFakeRepository(initialDomains: StoredDomain[] = []) {
  const domains = [...initialDomains]
  const wines: StoredWine[] = []
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
  const repository: CatalogRepository = {
    findAll: async () => domains.map((d) => ({ ...d, wines: wines.filter((w) => w.domainId === d.id) })),
    findDomainById: vi.fn(async (id: string) => domains.find((d) => d.id === id) ?? null),
    addDomain: vi.fn(async (name: string) => {
      if (domains.some((d) => same(d.name, name))) return null
      const domain = { id: crypto.randomUUID(), name, createdAt: "2026-11-24T10:00:00.000Z" }
      domains.push(domain)
      return domain
    }),
    addWine: vi.fn(async (domainId: string, name: string) => {
      if (wines.some((w) => w.domainId === domainId && same(w.name, name))) return null
      const wine = { id: crypto.randomUUID(), domainId, name, createdAt: "2026-11-24T10:00:00.000Z" }
      wines.push(wine)
      return wine
    }),
  }
  return repository
}

const dupont: StoredDomain = { id: DOMAIN_ID, name: "Domaine Dupont", createdAt: "2026-11-24T10:00:00.000Z" }

describe("listCatalog", () => {
  it("renvoie un catalogue vide quand il n'y a aucun domaine", async () => {
    expect(await listCatalog(createFakeRepository())).toEqual([])
  })

  it("renvoie les domaines avec leurs vins", async () => {
    const repository = createFakeRepository([dupont])
    await repository.addWine(DOMAIN_ID, "Chablis")

    expect(await listCatalog(repository)).toEqual([
      { ...dupont, wines: [expect.objectContaining({ name: "Chablis", domainId: DOMAIN_ID })] },
    ])
  })
})

describe("addDomain", () => {
  it("ajoute un domaine en enlevant les espaces autour du nom", async () => {
    const repository = createFakeRepository()

    const result = await addDomain({ name: "  Domaine Dupont " }, repository)

    expect(repository.addDomain).toHaveBeenCalledWith("Domaine Dupont")
    expect(result).toMatchObject({ ok: true, domain: { name: "Domaine Dupont" } })
  })

  it("refuse un domaine sans nom ou avec des espaces seulement, sans rien enregistrer", async () => {
    const repository = createFakeRepository()

    for (const name of [undefined, "", "   "]) {
      expect(await addDomain({ name }, repository)).toEqual({
        ok: false,
        errors: { name: "Le nom du domaine est obligatoire." },
      })
    }
    expect(repository.addDomain).not.toHaveBeenCalled()
  })

  it("refuse un domaine qui existe déjà", async () => {
    const repository = createFakeRepository([dupont])

    expect(await addDomain({ name: "domaine dupont" }, repository)).toEqual({
      ok: false,
      errors: { name: "Ce domaine existe déjà." },
    })
  })
})

describe("addWine", () => {
  it("ajoute un vin au domaine en enlevant les espaces autour du nom", async () => {
    const repository = createFakeRepository([dupont])

    const result = await addWine(DOMAIN_ID, { name: " Chablis 2022 " }, repository)

    expect(repository.addWine).toHaveBeenCalledWith(DOMAIN_ID, "Chablis 2022")
    expect(result).toMatchObject({ ok: true, wine: { domainId: DOMAIN_ID, name: "Chablis 2022" } })
  })

  it("refuse un vin sans nom, sans rien enregistrer", async () => {
    const repository = createFakeRepository([dupont])

    for (const name of [undefined, "", "   "]) {
      expect(await addWine(DOMAIN_ID, { name }, repository)).toEqual({
        ok: false,
        reason: "invalid",
        errors: { name: "Le nom du vin est obligatoire." },
      })
    }
    expect(repository.addWine).not.toHaveBeenCalled()
  })

  it("refuse un vin qui existe déjà dans ce domaine", async () => {
    const repository = createFakeRepository([dupont])
    await addWine(DOMAIN_ID, { name: "Chablis" }, repository)

    expect(await addWine(DOMAIN_ID, { name: "chablis" }, repository)).toEqual({
      ok: false,
      reason: "invalid",
      errors: { name: "Ce vin existe déjà dans ce domaine." },
    })
  })

  it("renvoie notFound pour un id qui n'est pas un UUID, sans interroger le repository", async () => {
    const repository = createFakeRepository([dupont])

    expect(await addWine("abc", { name: "Chablis" }, repository)).toEqual({ ok: false, reason: "notFound" })
    expect(repository.findDomainById).not.toHaveBeenCalled()
    expect(repository.addWine).not.toHaveBeenCalled()
  })

  it("renvoie notFound pour un domaine inconnu, sans rien enregistrer", async () => {
    const repository = createFakeRepository([dupont])

    expect(await addWine("0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", { name: "Chablis" }, repository)).toEqual({
      ok: false,
      reason: "notFound",
    })
    expect(repository.addWine).not.toHaveBeenCalled()
  })
})
