import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ContactDetailsForm, type ContactDetailsFormState } from "@/components/contact-details-form"
import type { CatalogDomain } from "@/services/catalog-service"
import type { Contact } from "@/services/contact-service"

afterEach(cleanup)

const contact: Contact = {
  id: "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b",
  lastName: "Durand",
  firstName: "Pierre",
  restaurant: "Le Comptoir",
  winesTasted: [{ id: "w1", name: "Morgon 2022", domainName: "Château Roux" }],
  comment: "Rappeler en décembre",
  lastVisitDate: "2026-11-12",
  stage: "premier_contact",
  interlocutor: "sommelier",
  channel: "telephone",
  isClient: false,
  nextStage: "degustation",
  previousStage: null,
  createdAt: "2026-11-23T10:00:00.000Z",
}

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
  {
    id: "d2",
    name: "Domaine Dupont",
    createdAt: CREATED_AT,
    wines: [{ id: "w3", domainId: "d2", name: "Chablis 2023", createdAt: CREATED_AT }],
  },
]

function wineBox(name: string): HTMLElement {
  return screen.getByRole("checkbox", { name })
}

function isChecked(name: string): boolean {
  return wineBox(name).getAttribute("aria-checked") === "true"
}

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByLabelText(label))
  const item = await screen.findByRole("option", { name: option })
  fireEvent.pointerDown(item, { pointerType: "mouse" })
  fireEvent.click(item)
}

function hiddenValue(container: HTMLElement, name: string): string | undefined {
  return (container.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)?.value
}

type Action = (state: ContactDetailsFormState, formData: FormData) => Promise<ContactDetailsFormState>

describe("ContactDetailsForm", () => {
  it("pré-remplit la fiche avec les valeurs enregistrées", () => {
    render(<ContactDetailsForm catalog={catalog} contact={contact} action={vi.fn<Action>(async () => ({}))} />)

    expect(isChecked("Morgon 2022")).toBe(true)
    expect(isChecked("Fleurie 2023")).toBe(false)
    expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Rappeler en décembre")
    expect((screen.getByLabelText("Dernière visite") as HTMLInputElement).value).toBe("2026-11-12")
  })

  it("laisse les champs vides pour un contact sans fiche", () => {
    render(
      <ContactDetailsForm
        catalog={catalog}
        contact={{ ...contact, winesTasted: [], comment: null, lastVisitDate: null }}
        action={vi.fn<Action>(async () => ({}))}
      />,
    )

    expect(["Morgon 2022", "Fleurie 2023", "Chablis 2023"].map(isChecked)).toEqual([false, false, false])
    expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("")
    expect((screen.getByLabelText("Dernière visite") as HTMLInputElement).value).toBe("")
  })

  it("envoie le commentaire et la date saisis", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(
      <ContactDetailsForm
        catalog={catalog}
        contact={{ ...contact, winesTasted: [], comment: null, lastVisitDate: null }}
        action={action}
      />,
    )

    fireEvent.change(screen.getByLabelText("Commentaire"), { target: { value: "Sommelier intéressé" } })
    fireEvent.change(screen.getByLabelText("Dernière visite"), { target: { value: "2026-11-12" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const formData = action.mock.calls[0][1]
    expect(formData.getAll("wineIds")).toEqual([])
    expect(formData.get("comment")).toBe("Sommelier intéressé")
    expect(formData.get("lastVisitDate")).toBe("2026-11-12")
  })

  it("signale une date refusée par l'action et garde la saisie", async () => {
    const action = vi.fn<Action>(async () => ({
      errors: { lastVisitDate: "La date de visite ne peut pas être dans le futur." },
      values: { wineIds: ["w3"], comment: "", lastVisitDate: "2027-01-01" },
    }))
    render(<ContactDetailsForm catalog={catalog} contact={contact} action={action} />)

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    const message = await screen.findByText("La date de visite ne peut pas être dans le futur.")
    const date = screen.getByLabelText("Dernière visite") as HTMLInputElement
    expect(date.getAttribute("aria-invalid")).toBe("true")
    expect(date.getAttribute("aria-describedby")).toBe(message.id)
    expect(date.value).toBe("2027-01-01")
    expect(isChecked("Chablis 2023")).toBe(true)
    expect(isChecked("Morgon 2022")).toBe(false)
  })

  it("affiche l'erreur de formulaire renvoyée par l'action", async () => {
    const action = vi.fn(async (): Promise<ContactDetailsFormState> => ({
      formError: "Le formulaire contient des valeurs invalides.",
    }))
    render(<ContactDetailsForm catalog={catalog} contact={contact} action={action} />)

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toBe("Le formulaire contient des valeurs invalides.")
  })

  it("pré-remplit l'interlocuteur et le canal enregistrés", () => {
    const { container } = render(<ContactDetailsForm catalog={catalog} contact={contact} action={vi.fn<Action>(async () => ({}))} />)

    expect(screen.getByLabelText("Interlocuteur").textContent).toContain("Sommelier")
    expect(screen.getByLabelText("Canal").textContent).toContain("Par téléphone")
    expect(hiddenValue(container, "interlocutor")).toBe("sommelier")
    expect(hiddenValue(container, "channel")).toBe("telephone")
  })

  it("envoie l'interlocuteur et le canal choisis", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(
      <ContactDetailsForm catalog={catalog} contact={{ ...contact, interlocutor: null, channel: null }} action={action} />,
    )

    await choose("Interlocuteur", "Sommelier")
    await choose("Canal", "Par téléphone")
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const formData = action.mock.calls[0][1]
    expect(formData.get("interlocutor")).toBe("sommelier")
    expect(formData.get("channel")).toBe("telephone")
  })

  it("envoie un interlocuteur et un canal vides quand rien n'est choisi", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(
      <ContactDetailsForm catalog={catalog} contact={{ ...contact, interlocutor: null, channel: null }} action={action} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const formData = action.mock.calls[0][1]
    expect(formData.get("interlocutor") ?? "").toBe("")
    expect(formData.get("channel") ?? "").toBe("")
  })

  it("propose l'interlocuteur et le canal à un client", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(
      <ContactDetailsForm
        catalog={catalog}
        contact={{ ...contact, stage: "commande", isClient: true, nextStage: null, previousStage: "degustation" }}
        action={action}
      />,
    )

    await choose("Interlocuteur", "Patron")
    await choose("Canal", "En personne")
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const formData = action.mock.calls[0][1]
    expect(formData.get("interlocutor")).toBe("patron")
    expect(formData.get("channel")).toBe("en_personne")
  })

  it("permet de vider un interlocuteur renseigné", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(<ContactDetailsForm catalog={catalog} contact={contact} action={action} />)

    await choose("Interlocuteur", "Non renseigné")
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const formData = action.mock.calls[0][1]
    expect(formData.get("interlocutor") ?? "").toBe("")
    expect(formData.get("channel")).toBe("telephone")
  })

  it("affiche « Vin(s) dégusté(s) » avec les vins regroupés par domaine", () => {
    render(<ContactDetailsForm catalog={catalog} contact={contact} action={vi.fn<Action>(async () => ({}))} />)

    const wines = within(screen.getByRole("group", { name: "Vin(s) dégusté(s)" }))
    const roux = within(wines.getByRole("group", { name: "Château Roux" }))
    expect(roux.getByRole("checkbox", { name: "Morgon 2022" })).toBeDefined()
    expect(roux.getByRole("checkbox", { name: "Fleurie 2023" })).toBeDefined()
    expect(roux.queryByRole("checkbox", { name: "Chablis 2023" })).toBeNull()
    const dupont = within(wines.getByRole("group", { name: "Domaine Dupont" }))
    expect(dupont.getByRole("checkbox", { name: "Chablis 2023" })).toBeDefined()
  })

  it("envoie les vins cochés, de domaines différents, sans ceux décochés", async () => {
    const action = vi.fn<Action>(async () => ({}))
    render(<ContactDetailsForm catalog={catalog} contact={contact} action={action} />)

    fireEvent.click(wineBox("Morgon 2022"))
    fireEvent.click(wineBox("Fleurie 2023"))
    fireEvent.click(wineBox("Chablis 2023"))
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(action.mock.calls[0][1].getAll("wineIds")).toEqual(["w2", "w3"])
  })

  it("invite à remplir le catalogue quand il est vide", () => {
    render(<ContactDetailsForm catalog={[]} contact={contact} action={vi.fn<Action>(async () => ({}))} />)

    expect(screen.getByText("Le catalogue est vide.")).toBeDefined()
    expect(screen.getByRole("link", { name: "Remplir le catalogue" }).getAttribute("href")).toBe("/catalogue")
    expect(screen.queryByRole("checkbox")).toBeNull()
  })
})
