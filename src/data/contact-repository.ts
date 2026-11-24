import { createClient, type Client, type Row } from "@libsql/client"
import { resolveDatabaseUrl } from "@/data/database-config"

export type Stage = "premier_contact" | "degustation" | "commande"

export type Interlocutor = "patron" | "sommelier"

export type Channel = "en_personne" | "telephone"

export type StoredContact = {
  id: string
  lastName: string
  firstName: string | null
  restaurant: string
  wineTasted: string | null
  comment: string | null
  lastVisitDate: string | null
  stage: Stage
  interlocutor: Interlocutor | null
  channel: Channel | null
  createdAt: string
}

export type NewContact = Pick<StoredContact, "lastName" | "firstName" | "restaurant" | "stage">

export type ContactDetails = Pick<
  StoredContact,
  "wineTasted" | "comment" | "lastVisitDate" | "interlocutor" | "channel"
>

export interface ContactRepository {
  add(contact: NewContact): Promise<StoredContact>
  findAll(): Promise<StoredContact[]>
  findWithoutVisitSince(cutoffDate: string): Promise<StoredContact[]>
  findById(id: string): Promise<StoredContact | null>
  update(id: string, details: ContactDetails): Promise<StoredContact | null>
  changeStage(id: string, from: Stage, to: Stage): Promise<StoredContact | null>
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
  stage: "ALTER TABLE contacts ADD COLUMN stage TEXT NOT NULL DEFAULT 'premier_contact'",
  interlocutor: "ALTER TABLE contacts ADD COLUMN interlocutor TEXT",
  channel: "ALTER TABLE contacts ADD COLUMN channel TEXT",
}

const COLUMNS =
  "id, last_name, first_name, restaurant, wine_tasted, comment, last_visit_date, stage, interlocutor, channel, created_at"

async function migrate(client: Client): Promise<void> {
  await client.execute(CREATE_TABLE)
  const { rows } = await client.execute("PRAGMA table_info(contacts)")
  const existing = new Set(rows.map((row) => String(row.name)))
  const missing = Object.entries(ADDED_COLUMNS)
    .filter(([column]) => !existing.has(column))
    .map(([, statement]) => statement)
  for (const statement of missing) {
    await addColumn(client, statement)
  }
}

async function addColumn(client: Client, statement: string): Promise<void> {
  try {
    await client.execute(statement)
  } catch (error) {
    if (!(error instanceof Error && /duplicate column name/i.test(error.message))) throw error
  }
}

function nullableString(value: Row[string]): string | null {
  return value === null ? null : String(value)
}

function toContact(row: Row): StoredContact {
  return {
    id: String(row.id),
    lastName: String(row.last_name),
    firstName: nullableString(row.first_name),
    restaurant: String(row.restaurant),
    wineTasted: nullableString(row.wine_tasted),
    comment: nullableString(row.comment),
    lastVisitDate: nullableString(row.last_visit_date),
    stage: String(row.stage) as Stage,
    interlocutor: nullableString(row.interlocutor) as Interlocutor | null,
    channel: nullableString(row.channel) as Channel | null,
    createdAt: String(row.created_at),
  }
}

export function createSqliteContactRepository(
  url: string,
  authToken?: string,
): ContactRepository & { close(): void } {
  const client = createClient({ url, authToken })
  let ready: Promise<void> | undefined
  const ensureSchema = () =>
    (ready ??= migrate(client).catch((error: unknown) => {
      ready = undefined
      throw error
    }))

  async function findById(id: string): Promise<StoredContact | null> {
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
      const created: StoredContact = {
        ...contact,
        id: crypto.randomUUID(),
        wineTasted: null,
        comment: null,
        lastVisitDate: null,
        interlocutor: null,
        channel: null,
        createdAt: new Date().toISOString(),
      }
      await client.execute({
        sql: "INSERT INTO contacts (id, last_name, first_name, restaurant, stage, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [created.id, created.lastName, created.firstName, created.restaurant, created.stage, created.createdAt],
      })
      return created
    },

    async findAll() {
      await ensureSchema()
      const result = await client.execute(`SELECT ${COLUMNS} FROM contacts ORDER BY created_at, rowid`)
      return result.rows.map(toContact)
    },

    async findWithoutVisitSince(cutoffDate) {
      await ensureSchema()
      const result = await client.execute({
        sql: `SELECT ${COLUMNS} FROM contacts
          WHERE last_visit_date IS NULL OR last_visit_date < ?
          ORDER BY last_visit_date IS NOT NULL, last_visit_date, created_at, rowid`,
        args: [cutoffDate],
      })
      return result.rows.map(toContact)
    },

    findById,

    async update(id, details) {
      await ensureSchema()
      const result = await client.execute({
        sql: "UPDATE contacts SET wine_tasted = ?, comment = ?, last_visit_date = ?, interlocutor = ?, channel = ? WHERE id = ?",
        args: [details.wineTasted, details.comment, details.lastVisitDate, details.interlocutor, details.channel, id],
      })
      return result.rowsAffected > 0 ? findById(id) : null
    },

    async changeStage(id, from, to) {
      await ensureSchema()
      const result = await client.execute({
        sql: "UPDATE contacts SET stage = ? WHERE id = ? AND stage = ?",
        args: [to, id, from],
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
