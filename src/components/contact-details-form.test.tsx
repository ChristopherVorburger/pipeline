import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ContactDetailsForm, type ContactDetailsFormState } from "@/components/contact-details-form"
import type { Contact } from "@/services/contact-service"

afterEach(cleanup)

const contact: Contact = {
  id: "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b",
  lastName: "Durand",
  firstName: "Pierre",
  restaurant: "Le Comptoir",
  wineTasted: "Chablis 2022",
  comment: "Rappeler en décembre",
  lastVisitDate: "2026-11-12",
  createdAt: "2026-11-23T10:00:00.000Z",
}

type Action = (state: ContactDetailsFormState, formData: FormData) => Promise<ContactDetailsFormState>

describe("ContactDetailsForm", () => {
  it("pré-remplit la fiche avec les valeurs enregistrées", () => {
    render(<ContactDetailsForm contact={contact} action={vi.fn<Action>(async () => ({}))} />)

    expect((screen.getByLabelText("Vin dégusté") as HTMLInputElement).value).toBe("Chablis 2022")
    expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Rappeler en décembre")
    expect((screen.getByLabelText("Dernière visite") as HTMLInputElement).value).toBe("2026-11-12")
  })

  it("laisse les champs vides pour un contact sans fiche", () => {
    render(
      <ContactDetailsForm
        contact={{ ...contact, wineTasted: null, comment: null, lastVisitDate: null }}
        action={vi.fn<Action>(async () => ({}))}
      />,
    )

    expect((screen.getByLabelText("Vin dégusté") as HTMLInputElement).value).toBe("")
    expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("")
    expect((screen.getByLabelText("Dernière visite") as HTMLInputElement).value).toBe("")
  })

  it("envoie le vin, le commentaire et la date saisis", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(
      <ContactDetailsForm
        contact={{ ...contact, wineTasted: null, comment: null, lastVisitDate: null }}
        action={action}
      />,
    )

    fireEvent.change(screen.getByLabelText("Vin dégusté"), { target: { value: "Morgon" } })
    fireEvent.change(screen.getByLabelText("Commentaire"), { target: { value: "Sommelier intéressé" } })
    fireEvent.change(screen.getByLabelText("Dernière visite"), { target: { value: "2026-11-12" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const formData = action.mock.calls[0][1]
    expect(formData.get("wineTasted")).toBe("Morgon")
    expect(formData.get("comment")).toBe("Sommelier intéressé")
    expect(formData.get("lastVisitDate")).toBe("2026-11-12")
  })

  it("signale une date refusée par l'action et garde la saisie", async () => {
    const action = vi.fn<Action>(async () => ({
      errors: { lastVisitDate: "La date de visite ne peut pas être dans le futur." },
      values: { wineTasted: "Morgon", comment: "", lastVisitDate: "2027-01-01" },
    }))
    render(<ContactDetailsForm contact={contact} action={action} />)

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    const message = await screen.findByText("La date de visite ne peut pas être dans le futur.")
    const date = screen.getByLabelText("Dernière visite") as HTMLInputElement
    expect(date.getAttribute("aria-invalid")).toBe("true")
    expect(date.getAttribute("aria-describedby")).toBe(message.id)
    expect(date.value).toBe("2027-01-01")
    expect((screen.getByLabelText("Vin dégusté") as HTMLInputElement).value).toBe("Morgon")
    expect(screen.getByLabelText("Vin dégusté").getAttribute("aria-invalid")).toBeNull()
  })
})
