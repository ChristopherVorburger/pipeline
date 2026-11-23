const DEFAULT_LOCAL_URL = "file:pipeline.db"

export function resolveDatabaseUrl(env: Record<string, string | undefined>): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL manquante : définis-la dans les variables d'environnement de production.",
    )
  }

  return DEFAULT_LOCAL_URL
}
