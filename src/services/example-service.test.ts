import { describe, expect, it } from "vitest"
import type { ExampleRepository } from "@/data/example-repository"
import { listExamples } from "@/services/example-service"

describe("listExamples", () => {
  it("renvoie les exemples fournis par le repository", async () => {
    const fakeRepository: ExampleRepository = {
      findAll: async () => [{ id: "1", label: "Exemple" }],
    }

    expect(await listExamples(fakeRepository)).toEqual([
      { id: "1", label: "Exemple" },
    ])
  })
})
