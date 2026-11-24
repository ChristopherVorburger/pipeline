import { createClient, type Row } from "@libsql/client"
import { resolveDatabaseUrl } from "@/data/database-config"
import { migrate } from "@/data/schema"

export type Stage = "premier_contact" | "degustation" | "commande"

export type Interlocutor = "patron" | "sommelier"

export type Channel = "en_personne" | "telephone"

export type TastedWine = {
  id: string
  name: string
  domainName: string
}

export type StoredContact = {
  id: string
  lastName: string
  firstName: string | null
  restaurant: string
  winesTasted: TastedWine[]
  comment: string | null
  lastVisitDate: string | null
  stage: Stage
  interlocutor: Interlocutor | null
  channel: Channel | null
  createdAt: string
}

export type NewContact = Pick<StoredContact, "lastName" | "firstName" | "restaurant" | "stage">

export type ContactDetails = Pick<StoredContact, "comment" | "lastVisitDate" | "interlocutor" | "channel"> & {
  wineIds: string[]
}

export interface ContactRepository {
  add(contact: NewContact): Promise<StoredContact>
  findAll(): Promise<StoredContact[]>
  findWithoutVisitSince(cutoffDate: string): Promise<StoredContact[]>
  findById(id: string): Promise<StoredContact | null>
  update(id: string, details: ContactDetails): Promise<StoredContact | null>
  changeStage(id: string, from: Stage, to: Stage): Promise<StoredContact | null>
}

const COLUMNS =
  "id, last_name, first_name, restaurant, comment, last_visit_date, stage, interlocutor, channel, created_at"

const TASTED_WINES = `SELECT contact_wines.contact_id, wines.id, wines.name, domains.name AS domain_name
  FROM contact_wines
  JOIN wines ON wines.id = contact_wines.wine_id
  JOIN domains ON domains.id = wines.domain_id`

const TASTED_WINES_ORDER = "ORDER BY domains.name, wines.name, wines.rowid"

function nullableString(value: Row[string]): string | null {
  return value === null ? null : String(value)
}

function toContact(row: Row, winesTasted: TastedWine[]): StoredContact {
  return {
    id: String(row.id),
    lastName: String(row.last_name),
    firstName: nullableString(row.first_name),
    restaurant: String(row.restaurant),
    winesTasted,
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

  async function withWines(rows: Row[], contactId?: string): Promise<StoredContact[]> {
    const result = await client.execute(
      contactId === undefined
        ? `${TASTED_WINES} ${TASTED_WINES_ORDER}`
        : { sql: `${TASTED_WINES} WHERE contact_wines.contact_id = ? ${TASTED_WINES_ORDER}`, args: [contactId] },
    )
    const byContact = new Map<string, TastedWine[]>()
    for (const row of result.rows) {
      const wines = byContact.get(String(row.contact_id)) ?? []
      wines.push({ id: String(row.id), name: String(row.name), domainName: String(row.domain_name) })
      byContact.set(String(row.contact_id), wines)
    }
    return rows.map((row) => toContact(row, byContact.get(String(row.id)) ?? []))
  }

  async function findById(id: string): Promise<StoredContact | null> {
    await ensureSchema()
    const result = await client.execute({
      sql: `SELECT ${COLUMNS} FROM contacts WHERE id = ?`,
      args: [id],
    })
    if (result.rows.length === 0) return null
    const [contact] = await withWines(result.rows, id)
    return contact
  }

  return {
    async add(contact) {
      await ensureSchema()
      const created: StoredContact = {
        ...contact,
        id: crypto.randomUUID(),
        winesTasted: [],
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
      return withWines(result.rows)
    },

    async findWithoutVisitSince(cutoffDate) {
      await ensureSchema()
      const result = await client.execute({
        sql: `SELECT ${COLUMNS} FROM contacts
          WHERE last_visit_date IS NULL OR last_visit_date < ?
          ORDER BY last_visit_date IS NOT NULL, last_visit_date, created_at, rowid`,
        args: [cutoffDate],
      })
      return withWines(result.rows)
    },

    findById,

    async update(id, details) {
      await ensureSchema()
      const [result] = await client.batch(
        [
          {
            sql: "UPDATE contacts SET comment = ?, last_visit_date = ?, interlocutor = ?, channel = ? WHERE id = ?",
            args: [details.comment, details.lastVisitDate, details.interlocutor, details.channel, id],
          },
          { sql: "DELETE FROM contact_wines WHERE contact_id = ?", args: [id] },
          ...details.wineIds.map((wineId) => ({
            sql: `INSERT OR IGNORE INTO contact_wines (contact_id, wine_id)
              SELECT contacts.id, wines.id FROM contacts, wines WHERE contacts.id = ? AND wines.id = ?`,
            args: [id, wineId],
          })),
        ],
        "write",
      )
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
