import { createClient, type Row } from "@libsql/client"
import { resolveDatabaseUrl } from "@/data/database-config"
import { migrate, nameKey } from "@/data/schema"

export type StoredDomain = {
  id: string
  name: string
  createdAt: string
}

export type StoredWine = {
  id: string
  domainId: string
  name: string
  createdAt: string
}

export type StoredCatalogDomain = StoredDomain & { wines: StoredWine[] }

export interface CatalogRepository {
  findAll(): Promise<StoredCatalogDomain[]>
  findDomainById(id: string): Promise<StoredDomain | null>
  addDomain(name: string): Promise<StoredDomain | null>
  addWine(domainId: string, name: string): Promise<StoredWine | null>
}

function toDomain(row: Row): StoredDomain {
  return { id: String(row.id), name: String(row.name), createdAt: String(row.created_at) }
}

function toWine(row: Row): StoredWine {
  return {
    id: String(row.id),
    domainId: String(row.domain_id),
    name: String(row.name),
    createdAt: String(row.created_at),
  }
}

export function createSqliteCatalogRepository(
  url: string,
  authToken?: string,
): CatalogRepository & { close(): void } {
  const client = createClient({ url, authToken })
  let ready: Promise<void> | undefined
  const ensureSchema = () =>
    (ready ??= migrate(client).catch((error: unknown) => {
      ready = undefined
      throw error
    }))

  return {
    async findAll() {
      await ensureSchema()
      const domains = await client.execute("SELECT id, name, created_at FROM domains ORDER BY name_key, name, rowid")
      const wines = await client.execute("SELECT id, domain_id, name, created_at FROM wines ORDER BY name_key, name, rowid")
      const storedWines = wines.rows.map(toWine)
      return domains.rows.map(toDomain).map((domain) => ({
        ...domain,
        wines: storedWines.filter((wine) => wine.domainId === domain.id),
      }))
    },

    async findDomainById(id) {
      await ensureSchema()
      const result = await client.execute({
        sql: "SELECT id, name, created_at FROM domains WHERE id = ?",
        args: [id],
      })
      return result.rows.length > 0 ? toDomain(result.rows[0]) : null
    },

    async addDomain(name) {
      await ensureSchema()
      const domain: StoredDomain = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
      const result = await client.execute({
        sql: "INSERT INTO domains (id, name, name_key, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
        args: [domain.id, domain.name, nameKey(domain.name), domain.createdAt],
      })
      return result.rowsAffected > 0 ? domain : null
    },

    async addWine(domainId, name) {
      await ensureSchema()
      const wine: StoredWine = { id: crypto.randomUUID(), domainId, name, createdAt: new Date().toISOString() }
      const result = await client.execute({
        sql: "INSERT INTO wines (id, domain_id, name, name_key, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
        args: [wine.id, wine.domainId, wine.name, nameKey(wine.name), wine.createdAt],
      })
      return result.rowsAffected > 0 ? wine : null
    },

    close() {
      client.close()
    },
  }
}

let catalogRepository: CatalogRepository | undefined

export function getCatalogRepository(): CatalogRepository {
  catalogRepository ??= createSqliteCatalogRepository(
    resolveDatabaseUrl(process.env),
    process.env.DATABASE_AUTH_TOKEN || undefined,
  )
  return catalogRepository
}
