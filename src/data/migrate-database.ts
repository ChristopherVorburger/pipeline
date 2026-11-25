import { createClient } from "@libsql/client"
import { resolveDatabaseUrl } from "@/data/database-config"
import { migrate } from "@/data/schema"

async function migrateDatabase(): Promise<void> {
  const url = resolveDatabaseUrl(process.env)
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })

  try {
    await migrate(client)
    const { rows } = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    console.log(`Migration terminée sur ${url.startsWith("file:") ? url : new URL(url).host}`)
    console.log(`Tables : ${rows.map((row) => String(row.name)).join(", ")}`)
  } finally {
    client.close()
  }
}

migrateDatabase().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
