import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ContactForm, type ContactFormState } from "@/components/contact-form"

afterEach(cleanup)

describe("ContactForm", () => {
  it("envoie le nom, le prénom et le restaurant saisis", async () => {
    const action = vi.fn<(state: ContactFormState, formData: FormData) => Promise<ContactFormState>>(
      async () => ({}),
    )
    render(<ContactForm action={action} />)

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Durand" } })
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Pierre" } })
    fireEvent.change(screen.getByLabelText("Restaurant"), { target: { value: "Le Comptoir" } })
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const formData = action.mock.calls[0][1]
    expect(formData.get("lastName")).toBe("Durand")
    expect(formData.get("firstName")).toBe("Pierre")
    expect(formData.get("restaurant")).toBe("Le Comptoir")
  })

  it("signale le champ manquant renvoyé par l'action", async () => {
    const action = vi.fn(
      async (): Promise<ContactFormState> => ({
        errors: { restaurant: "Le restaurant est obligatoire." },
        values: { lastName: "Durand", firstName: "", restaurant: "" },
      }),
    )
    render(<ContactForm action={action} />)

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Durand" } })
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }))

    const message = await screen.findByText("Le restaurant est obligatoire.")
    const restaurant = screen.getByLabelText("Restaurant")
    expect(restaurant.getAttribute("aria-invalid")).toBe("true")
    expect(restaurant.getAttribute("aria-describedby")).toBe(message.id)
    expect(screen.getByLabelText("Nom").getAttribute("aria-invalid")).toBeNull()
    expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Durand")
  })

  it("affiche l'erreur de formulaire renvoyée par l'action", async () => {
    const action = vi.fn(async (): Promise<ContactFormState> => ({
      formError: "Le formulaire contient des valeurs invalides.",
    }))
    render(<ContactForm action={action} />)

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toBe("Le formulaire contient des valeurs invalides.")
  })
})
