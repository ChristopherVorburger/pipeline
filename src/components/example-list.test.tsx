import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { ExampleList } from "@/components/example-list"

afterEach(cleanup)

describe("ExampleList", () => {
  it("affiche un message quand la liste est vide", () => {
    render(<ExampleList examples={[]} />)

    expect(screen.getByText("Aucun exemple.")).toBeDefined()
  })

  it("affiche chaque exemple", () => {
    render(<ExampleList examples={[{ id: "1", label: "Exemple" }]} />)

    expect(screen.getByRole("listitem").textContent).toBe("Exemple")
  })
})
