import { createClient, type Client, type Row } from "@libsql/client"
import { resolveDatabaseUrl } from "@/data/database-config"

export type Contact = {
  id: string
  lastName: string
  firstName: string | null
  restaurant: string
  wineTasted: string | null
  comment: string | null
  lastVisitDate: string | null
  createdAt: string
}

export type NewContact = Pick<Contact, "lastName" | "firstName" | "restaurant">

export type ContactDetails = Pick<Contact, "wineTasted" | "comment" | "lastVisitDate">

export interface ContactRepository {
  add(contact: NewContact): Promise<Contact>
  findAll(): Promise<Contact[]>
  findById(id: string): Promise<Contact | null>
  update(id: string, details: ContactDetails): Promise<Contact | null>
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

const ADDED_COLUMNS = {
  wine_tasted: "ALTER TABLE contacts ADD COLUMN wine_tasted TEXT",
  comment: "ALTER TABLE contacts ADD COLUMN comment TEXT",
  last_visit_date: "ALTER TABLE contacts ADD COLUMN last_visit_date TEXT",
}

const COLUMNS = "id, last_name, first_name, restaurant, wine_tasted, comment, last_visit_date, created_at"

async function migrate(client: Client): Promise<void> {
  await client.execute(CREATE_TABLE)
  const { rows } = await client.execute("PRAGMA table_info(contacts)")
  const existing = new Set(rows.map((row) => String(row.name)))
  const missing = Object.entries(ADDED_COLUMNS)
    .filter(([column]) => !existing.has(column))
    .map(([, statement]) => statement)
  if (missing.length > 0) {
    await client.batch(missing, "write")
  }
}

function nullableString(value: Row[string]): string | null {
  return value === null ? null : String(value)
}

function toContact(row: Row): Contact {
  return {
    id: String(row.id),
    lastName: String(row.last_name),
    firstName: nullableString(row.first_name),
    restaurant: String(row.restaurant),
    wineTasted: nullableString(row.wine_tasted),
    comment: nullableString(row.comment),
    lastVisitDate: nullableString(row.last_visit_date),
    createdAt: String(row.created_at),
  }
}

export function createSqliteContactRepository(
  url: string,
  authToken?: string,
): ContactRepository & { close(): void } {
  const client = createClient({ url, authToken })
  let ready: Promise<void> | undefined
  const ensureSchema = () => (ready ??= migrate(client))

  async function findById(id: string): Promise<Contact | null> {
    await ensureSchema()
    const result = await client.execute({
      sql: `SELECT ${COLUMNS} FROM contacts WHERE id = ?`,
      args: [id],
    })
    return result.rows.length > 0 ? toContact(result.rows[0]) : null
  }

  return {
    async add(contact) {
      await ensureSchema()
      const created: Contact = {
        ...contact,
        id: crypto.randomUUID(),
        wineTasted: null,
        comment: null,
        lastVisitDate: null,
        createdAt: new Date().toISOString(),
      }
      await client.execute({
        sql: "INSERT INTO contacts (id, last_name, first_name, restaurant, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [created.id, created.lastName, created.firstName, created.restaurant, created.createdAt],
      })
      return created
    },

    async findAll() {
      await ensureSchema()
      const result = await client.execute(`SELECT ${COLUMNS} FROM contacts ORDER BY created_at, rowid`)
      return result.rows.map(toContact)
    },

    findById,

    async update(id, details) {
      await ensureSchema()
      const result = await client.execute({
        sql: "UPDATE contacts SET wine_tasted = ?, comment = ?, last_visit_date = ? WHERE id = ?",
        args: [details.wineTasted, details.comment, details.lastVisitDate, id],
      })
      return result.rowsAffected > 0 ? findById(id) : null
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
