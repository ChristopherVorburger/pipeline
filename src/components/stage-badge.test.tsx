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
})
