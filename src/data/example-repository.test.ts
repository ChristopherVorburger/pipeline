import { describe, expect, it } from "vitest"
import { createInMemoryExampleRepository } from "@/data/example-repository"

describe("createInMemoryExampleRepository", () => {
  it("renvoie une liste vide par défaut", async () => {
    const repository = createInMemoryExampleRepository()

    expect(await repository.findAll()).toEqual([])
  })
})
