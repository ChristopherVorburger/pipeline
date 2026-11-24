import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ContactStage } from "@/components/contact-stage"

afterEach(cleanup)

const noop = async () => {}

describe("ContactStage", () => {
  it("affiche l'étape actuelle et propose l'étape suivante", async () => {
    const action = vi.fn(noop)
    render(
      <ContactStage
        stage="premier_contact"
        isClient={false}
        nextStage="degustation"
        previousStage={null}
        action={action}
        revertAction={vi.fn(noop)}
      />,
    )

    expect(screen.getByText("Premier contact")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Étape suivante · Dégustation" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  })

  it("ne propose pas l'étape précédente en premier contact", () => {
    render(
      <ContactStage
        stage="premier_contact"
        isClient={false}
        nextStage="degustation"
        previousStage={null}
        action={vi.fn(noop)}
        revertAction={vi.fn(noop)}
      />,
    )

    expect(screen.queryByRole("button", { name: /Étape précédente/ })).toBeNull()
  })

  it("propose commande et le retour en premier contact à un contact en dégustation", async () => {
    const revertAction = vi.fn(noop)
    render(
      <ContactStage
        stage="degustation"
        isClient={false}
        nextStage="commande"
        previousStage="premier_contact"
        action={vi.fn(noop)}
        revertAction={revertAction}
      />,
    )

    expect(screen.getByRole("button", { name: "Étape suivante · Commande" })).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Étape précédente · Premier contact" }))

    await waitFor(() => expect(revertAction).toHaveBeenCalledTimes(1))
  })

  it("ne propose plus l'étape suivante à un client, mais le retour en dégustation", () => {
    render(
      <ContactStage
        stage="commande"
        isClient
        nextStage={null}
        previousStage="degustation"
        action={vi.fn(noop)}
        revertAction={vi.fn(noop)}
      />,
    )

    expect(screen.getByText("Client")).toBeDefined()
    expect(screen.queryByRole("button", { name: /Étape suivante/ })).toBeNull()
    expect(screen.getByRole("button", { name: "Étape précédente · Dégustation" })).toBeDefined()
  })
})
