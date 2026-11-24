import type { Client } from "@libsql/client"

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
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS wines (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL REFERENCES domains(id),
    name TEXT NOT NULL COLLATE NOCASE,
    created_at TEXT NOT NULL,
    UNIQUE (domain_id, name)
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
}

async function ignoreIfAlreadyMigrated(migration: Promise<unknown>): Promise<void> {
  try {
    await migration
  } catch (error) {
    if (!(error instanceof Error && ALREADY_MIGRATED.test(error.message))) throw error
  }
}
