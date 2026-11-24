import type { Client, InStatement } from "@libsql/client"

export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    last_name TEXT NOT NULL,
    first_name TEXT,
    restaurant TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS wines (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL REFERENCES domains(id),
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS contact_wines (
    contact_id TEXT NOT NULL REFERENCES contacts(id),
    wine_id TEXT NOT NULL REFERENCES wines(id),
    PRIMARY KEY (contact_id, wine_id)
  )`,
]

const ADDED_CONTACT_COLUMNS = {
  comment: "ALTER TABLE contacts ADD COLUMN comment TEXT",
  last_visit_date: "ALTER TABLE contacts ADD COLUMN last_visit_date TEXT",
  stage: "ALTER TABLE contacts ADD COLUMN stage TEXT NOT NULL DEFAULT 'premier_contact'",
  interlocutor: "ALTER TABLE contacts ADD COLUMN interlocutor TEXT",
  channel: "ALTER TABLE contacts ADD COLUMN channel TEXT",
}

const ADDED_NAME_KEYS = {
  domains: "ALTER TABLE domains ADD COLUMN name_key TEXT",
  wines: "ALTER TABLE wines ADD COLUMN name_key TEXT",
}

const UNIQUE_NAME_KEYS = [
  "CREATE UNIQUE INDEX IF NOT EXISTS domains_name_key ON domains (name_key)",
  "CREATE UNIQUE INDEX IF NOT EXISTS wines_domain_name_key ON wines (domain_id, name_key)",
]

const LEGACY_WINE_TO_COMMENT = [
  `UPDATE contacts
    SET comment = CASE
      WHEN comment IS NULL OR comment = '' THEN 'Vin dégusté : ' || wine_tasted
      ELSE comment || char(10) || 'Vin dégusté : ' || wine_tasted
    END
    WHERE wine_tasted IS NOT NULL AND trim(wine_tasted) <> ''`,
  "ALTER TABLE contacts DROP COLUMN wine_tasted",
]

const ALREADY_MIGRATED = /duplicate column name|no such column/i

export async function migrate(client: Client): Promise<void> {
  for (const statement of CREATE_TABLES) {
    await client.execute(statement)
  }

  const { rows } = await client.execute("PRAGMA table_info(contacts)")
  const existing = new Set(rows.map((row) => String(row.name)))

  for (const [column, statement] of Object.entries(ADDED_CONTACT_COLUMNS)) {
    if (!existing.has(column)) await ignoreIfAlreadyMigrated(client.execute(statement))
  }

  if (existing.has("wine_tasted")) {
    await ignoreIfAlreadyMigrated(client.batch(LEGACY_WINE_TO_COMMENT, "write"))
  }

  for (const [table, statement] of Object.entries(ADDED_NAME_KEYS)) {
    const columns = await client.execute(`PRAGMA table_info(${table})`)
    if (!columns.rows.some((row) => row.name === "name_key")) {
      await ignoreIfAlreadyMigrated(client.execute(statement))
    }
  }

  await fillNameKeys(client)

  for (const statement of UNIQUE_NAME_KEYS) {
    await client.execute(statement)
  }
}

async function fillNameKeys(client: Client): Promise<void> {
  const missing = await client.execute(
    "SELECT 1 FROM domains WHERE name_key IS NULL UNION ALL SELECT 1 FROM wines WHERE name_key IS NULL LIMIT 1",
  )
  if (missing.rows.length === 0) return

  await client.batch(await mergeDuplicates(client), "write")
}

async function mergeDuplicates(client: Client): Promise<InStatement[]> {
  const domains = await client.execute("SELECT id, name FROM domains ORDER BY created_at, rowid")
  const wines = await client.execute("SELECT id, domain_id, name FROM wines ORDER BY created_at, rowid")
  const statements: InStatement[] = []

  const domainKeeper = new Map<string, string>()
  const keeperByKey = new Map<string, string>()
  for (const row of domains.rows) {
    const key = nameKey(String(row.name))
    const keeper = keeperByKey.get(key) ?? String(row.id)
    keeperByKey.set(key, keeper)
    domainKeeper.set(String(row.id), keeper)
    if (keeper === String(row.id)) {
      statements.push({ sql: "UPDATE domains SET name_key = ? WHERE id = ?", args: [key, keeper] })
    }
  }

  const wineKeeperByKey = new Map<string, string>()
  const moves: InStatement[] = []
  for (const row of wines.rows) {
    const id = String(row.id)
    const domainId = domainKeeper.get(String(row.domain_id)) ?? String(row.domain_id)
    const key = nameKey(String(row.name))
    const keeper = wineKeeperByKey.get(`${domainId}\u0000${key}`)
    if (keeper) {
      statements.push(
        { sql: "UPDATE OR IGNORE contact_wines SET wine_id = ? WHERE wine_id = ?", args: [keeper, id] },
        { sql: "DELETE FROM contact_wines WHERE wine_id = ?", args: [id] },
        { sql: "DELETE FROM wines WHERE id = ?", args: [id] },
      )
    } else {
      wineKeeperByKey.set(`${domainId}\u0000${key}`, id)
      moves.push({ sql: "UPDATE wines SET domain_id = ?, name_key = ? WHERE id = ?", args: [domainId, key, id] })
    }
  }

  const duplicateDomains = [...domainKeeper].filter(([id, keeper]) => id !== keeper).map(([id]) => id)
  return [
    ...statements,
    ...moves,
    ...duplicateDomains.map((id) => ({ sql: "DELETE FROM domains WHERE id = ?", args: [id] })),
  ]
}

async function ignoreIfAlreadyMigrated(migration: Promise<unknown>): Promise<void> {
  try {
    await migration
  } catch (error) {
    if (!(error instanceof Error && ALREADY_MIGRATED.test(error.message))) throw error
  }
}
