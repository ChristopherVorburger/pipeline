import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ContactStage } from "@/components/contact-stage"

afterEach(cleanup)

describe("ContactStage", () => {
  it("affiche l'étape actuelle et propose l'étape suivante", async () => {
    const action = vi.fn(async () => {})
    render(<ContactStage stage="premier_contact" isClient={false} nextStage="degustation" action={action} />)

    expect(screen.getByText("Premier contact")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Étape suivante · Dégustation" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  })

  it("propose commande à un contact en dégustation", () => {
    render(<ContactStage stage="degustation" isClient={false} nextStage="commande" action={vi.fn(async () => {})} />)

    expect(screen.getByRole("button", { name: "Étape suivante · Commande" })).toBeDefined()
  })

  it("ne propose plus l'étape suivante à un client", () => {
    render(<ContactStage stage="commande" isClient nextStage={null} action={vi.fn(async () => {})} />)

    expect(screen.getByText("Client")).toBeDefined()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
