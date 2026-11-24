import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { ContactList } from "@/components/contact-list"
import type { Contact } from "@/services/contact-service"

afterEach(cleanup)

function contact(overrides: Partial<Contact>): Contact {
  return {
    id: "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b",
    lastName: "Durand",
    firstName: null,
    restaurant: "Le Comptoir",
    wineTasted: null,
    comment: null,
    lastVisitDate: null,
    createdAt: "",
    ...overrides,
  }
}

describe("ContactList", () => {
  it("affiche un message quand il n'y a aucun contact", () => {
    render(<ContactList contacts={[]} />)

    expect(screen.getByText("Aucun contact.")).toBeDefined()
  })

  it("affiche le nom, le prénom et le restaurant de chaque contact", () => {
    render(
      <ContactList
        contacts={[
          contact({ id: "1", lastName: "Roux", firstName: "Camille", restaurant: "Les Halles" }),
          contact({ id: "2" }),
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

  it("relie chaque contact à sa fiche", () => {
    render(<ContactList contacts={[contact({ firstName: "Pierre" })]} />)

    expect(screen.getByRole("link", { name: /Pierre Durand/ }).getAttribute("href")).toBe(
      "/contacts/3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b",
    )
  })

  it("affiche la date de dernière visite au format jour/mois/année et le vin dégusté", () => {
    render(<ContactList contacts={[contact({ lastVisitDate: "2026-11-12", wineTasted: "Chablis 2022" })]} />)

    const item = screen.getByRole("listitem")
    expect(item.textContent).toContain("12/11/2026")
    expect(item.textContent).toContain("Chablis 2022")
  })

  it("n'affiche ni date ni vin pour un contact sans fiche", () => {
    render(<ContactList contacts={[contact({})]} />)

    const item = screen.getByRole("listitem")
    expect(item.textContent).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(screen.queryByText(/Dernière visite/)).toBeNull()
    expect(screen.queryByText(/Vin/)).toBeNull()
  })
})
