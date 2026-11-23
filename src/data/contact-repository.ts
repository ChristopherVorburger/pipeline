import { createClient, type Row } from "@libsql/client"
import { resolveDatabaseUrl } from "@/data/database-config"

export type Contact = {
  id: string
  lastName: string
  firstName: string | null
  restaurant: string
  createdAt: string
}

export type NewContact = Pick<Contact, "lastName" | "firstName" | "restaurant">

export interface ContactRepository {
  add(contact: NewContact): Promise<Contact>
  findAll(): Promise<Contact[]>
}

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    last_name TEXT NOT NULL,
    first_name TEXT,
    restaurant TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`

function toContact(row: Row): Contact {
  return {
    id: String(row.id),
    lastName: String(row.last_name),
    firstName: row.first_name === null ? null : String(row.first_name),
    restaurant: String(row.restaurant),
    createdAt: String(row.created_at),
  }
}

export function createSqliteContactRepository(
  url: string,
  authToken?: string,
): ContactRepository & { close(): void } {
  const client = createClient({ url, authToken })
  let ready: Promise<unknown> | undefined
  const ensureTable = () => (ready ??= client.execute(CREATE_TABLE))

  return {
    async add(contact) {
      await ensureTable()
      const created: Contact = {
        ...contact,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      await client.execute({
        sql: "INSERT INTO contacts (id, last_name, first_name, restaurant, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [created.id, created.lastName, created.firstName, created.restaurant, created.createdAt],
      })
      return created
    },

    async findAll() {
      await ensureTable()
      const result = await client.execute(
        "SELECT id, last_name, first_name, restaurant, created_at FROM contacts ORDER BY created_at, rowid",
      )
      return result.rows.map(toContact)
    },

    close() {
      client.close()
    },
  }
}

let contactRepository: ContactRepository | undefined

export function getContactRepository(): ContactRepository {
  contactRepository ??= createSqliteContactRepository(
    resolveDatabaseUrl(process.env),
    process.env.DATABASE_AUTH_TOKEN || undefined,
  )
  return contactRepository
}
