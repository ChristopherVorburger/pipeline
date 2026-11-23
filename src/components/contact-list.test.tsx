import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { ContactList } from "@/components/contact-list"

afterEach(cleanup)

describe("ContactList", () => {
  it("affiche un message quand il n'y a aucun contact", () => {
    render(<ContactList contacts={[]} />)

    expect(screen.getByText("Aucun contact.")).toBeDefined()
  })

  it("affiche le nom, le prénom et le restaurant de chaque contact", () => {
    render(
      <ContactList
        contacts={[
          { id: "1", lastName: "Roux", firstName: "Camille", restaurant: "Les Halles", createdAt: "" },
          { id: "2", lastName: "Durand", firstName: null, restaurant: "Le Comptoir", createdAt: "" },
        ]}
      />,
    )

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain("Camille Roux")
    expect(items[0].textContent).toContain("Les Halles")
    expect(items[1].textContent).toContain("Durand")
    expect(items[1].textContent).toContain("Le Comptoir")
    expect(screen.queryByText("Aucun contact.")).toBeNull()
  })
})
