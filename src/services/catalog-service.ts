import * as z from "zod"
import {
  getCatalogRepository,
  type CatalogRepository,
  type StoredCatalogDomain,
  type StoredDomain,
  type StoredWine,
} from "@/data/catalog-repository"

export type Domain = StoredDomain

export type Wine = StoredWine

export type CatalogDomain = StoredCatalogDomain

export type CatalogEntryInput = {
  name?: string
}

export type CatalogEntryErrors = {
  name?: string
}

export type AddDomainResult = { ok: true; domain: Domain } | { ok: false; errors: CatalogEntryErrors }

export type AddWineResult =
  | { ok: true; wine: Wine }
  | { ok: false; reason: "notFound" }
  | { ok: false; reason: "invalid"; errors: CatalogEntryErrors }

const requiredName = (message: string) =>
  z.object({ name: z.string({ error: message }).trim().min(1, message) })

const domainSchema = requiredName("Le nom du domaine est obligatoire.")

const wineSchema = requiredName("Le nom du vin est obligatoire.")

const domainId = z.uuid()

function nameError(error: z.ZodError<{ name: string }>): CatalogEntryErrors {
  return { name: z.flattenError(error).fieldErrors.name?.[0] }
}

export async function listCatalog(
  repository: CatalogRepository = getCatalogRepository(),
): Promise<CatalogDomain[]> {
  return repository.findAll()
}

export async function addDomain(
  input: CatalogEntryInput,
  repository: CatalogRepository = getCatalogRepository(),
): Promise<AddDomainResult> {
  const parsed = domainSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errors: nameError(parsed.error) }

  const domain = await repository.addDomain(parsed.data.name)
  return domain ? { ok: true, domain } : { ok: false, errors: { name: "Ce domaine existe déjà." } }
}

export async function addWine(
  rawDomainId: string,
  input: CatalogEntryInput,
  repository: CatalogRepository = getCatalogRepository(),
): Promise<AddWineResult> {
  const id = domainId.safeParse(rawDomainId)
  if (!id.success) return { ok: false, reason: "notFound" }

  const parsed = wineSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: "invalid", errors: nameError(parsed.error) }

  if (!(await repository.findDomainById(id.data))) return { ok: false, reason: "notFound" }

  const wine = await repository.addWine(id.data, parsed.data.name)
  return wine
    ? { ok: true, wine }
    : { ok: false, reason: "invalid", errors: { name: "Ce vin existe déjà dans ce domaine." } }
}
