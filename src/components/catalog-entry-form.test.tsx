import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CatalogEntryForm, type CatalogEntryFormState } from "@/components/catalog-entry-form"

afterEach(cleanup)

type Action = (state: CatalogEntryFormState, formData: FormData) => Promise<CatalogEntryFormState>

describe("CatalogEntryForm", () => {
  it("envoie le nom saisi", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(<CatalogEntryForm label="Nouveau domaine" submitLabel="Ajouter le domaine" action={action} />)

    fireEvent.change(screen.getByLabelText("Nouveau domaine"), { target: { value: "Domaine Dupont" } })
    fireEvent.click(screen.getByRole("button", { name: "Ajouter le domaine" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(action.mock.calls[0][1].get("name")).toBe("Domaine Dupont")
  })

  it("signale l'erreur renvoyée par l'action et garde la saisie", async () => {
    const action = vi.fn<Action>(async () => ({
      errors: { name: "Ce domaine existe déjà." },
      values: { name: "Domaine Dupont" },
    }))
    render(<CatalogEntryForm label="Nouveau domaine" submitLabel="Ajouter le domaine" action={action} />)

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le domaine" }))

    const message = await screen.findByText("Ce domaine existe déjà.")
    const input = screen.getByLabelText("Nouveau domaine") as HTMLInputElement
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.getAttribute("aria-describedby")).toBe(message.id)
    expect(input.value).toBe("Domaine Dupont")
  })

  it("affiche l'erreur de formulaire renvoyée par l'action", async () => {
    const action = vi.fn<Action>(async () => ({ formError: "Le formulaire contient des valeurs invalides." }))
    render(<CatalogEntryForm label="Nouveau vin" submitLabel="Ajouter le vin" action={action} />)

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le vin" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Le formulaire contient des valeurs invalides.")
  })
})
