import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { CatalogList } from "@/components/catalog-list"
import type { CatalogDomain } from "@/services/catalog-service"

afterEach(cleanup)

const CREATED_AT = "2026-11-24T10:00:00.000Z"

const catalog: CatalogDomain[] = [
  {
    id: "d1",
    name: "Château Roux",
    createdAt: CREATED_AT,
    wines: [
      { id: "w1", domainId: "d1", name: "Morgon 2022", createdAt: CREATED_AT },
      { id: "w2", domainId: "d1", name: "Fleurie 2023", createdAt: CREATED_AT },
    ],
  },
  { id: "d2", name: "Domaine Dupont", createdAt: CREATED_AT, wines: [] },
]

const noAction = () => vi.fn(async () => ({}))

describe("CatalogList", () => {
  it("affiche un message quand le catalogue est vide", () => {
    render(<CatalogList domains={[]} wineActionFor={noAction} />)

    expect(screen.getByText("Aucun domaine.")).toBeDefined()
  })

  it("affiche chaque vin sous son domaine", () => {
    render(<CatalogList domains={catalog} wineActionFor={noAction} />)

    const roux = within(screen.getByRole("region", { name: "Château Roux" }))
    expect(roux.getByText("Morgon 2022")).toBeDefined()
    expect(roux.getByText("Fleurie 2023")).toBeDefined()
    const dupont = within(screen.getByRole("region", { name: "Domaine Dupont" }))
    expect(dupont.queryByText("Morgon 2022")).toBeNull()
    expect(dupont.getByText("Aucun vin.")).toBeDefined()
  })

  it("propose d'ajouter un vin à chaque domaine, avec l'action de ce domaine", () => {
    const wineActionFor = vi.fn(noAction)
    render(<CatalogList domains={catalog} wineActionFor={wineActionFor} />)

    for (const name of ["Château Roux", "Domaine Dupont"]) {
      const region = within(screen.getByRole("region", { name }))
      expect(region.getByLabelText("Nouveau vin")).toBeDefined()
      expect(region.getByRole("button", { name: "Ajouter le vin" })).toBeDefined()
    }
    expect(wineActionFor).toHaveBeenCalledWith("d1")
    expect(wineActionFor).toHaveBeenCalledWith("d2")
  })
})
