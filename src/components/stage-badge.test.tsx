import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { StageBadge } from "@/components/stage-badge"

afterEach(cleanup)

describe("StageBadge", () => {
  it("affiche premier contact", () => {
    render(<StageBadge stage="premier_contact" isClient={false} />)

    expect(screen.getByText("Premier contact")).toBeDefined()
    expect(screen.queryByText("Client")).toBeNull()
  })

  it("affiche dégustation", () => {
    render(<StageBadge stage="degustation" isClient={false} />)

    expect(screen.getByText("Dégustation")).toBeDefined()
  })

  it("affiche commande et client pour un client", () => {
    render(<StageBadge stage="commande" isClient />)

    expect(screen.getByText("Commande")).toBeDefined()
    expect(screen.getByText("Client")).toBeDefined()
  })

  it("affiche le badge client avec la variante accent du design system", () => {
    render(<StageBadge stage="commande" isClient />)

    const client = screen.getByText("Client")
    expect(client.getAttribute("data-variant")).toBe("accent")
    expect(client.className).not.toContain("bg-primary")
  })
})
