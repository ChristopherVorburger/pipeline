// @vitest-environment node
import { describe, expect, it } from "vitest"
import { resolveDatabaseUrl } from "@/data/database-config"

describe("resolveDatabaseUrl", () => {
  it("renvoie DATABASE_URL quand elle est définie", () => {
    expect(
      resolveDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: "libsql://exemple.turso.io" }),
    ).toBe("libsql://exemple.turso.io")
  })

  it("se rabat sur file:pipeline.db hors production", () => {
    expect(resolveDatabaseUrl({ NODE_ENV: "development" })).toBe("file:pipeline.db")
  })

  it("échoue avec un message clair en production sans DATABASE_URL", () => {
    expect(() => resolveDatabaseUrl({ NODE_ENV: "production" })).toThrow(
      "DATABASE_URL manquante",
    )
  })

  it("traite une DATABASE_URL vide comme absente", () => {
    expect(() => resolveDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: "" })).toThrow(
      "DATABASE_URL manquante",
    )
  })
})
