// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import { createContact, updateContact } from "@/app/actions"
import { addContact, updateContactDetails, type Contact } from "@/services/contact-service"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }))
vi.mock("@/services/contact-service", () => ({
  addContact: vi.fn(),
  updateContactDetails: vi.fn(),
}))

const ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b"
const FORM_ERROR = "Le formulaire contient des valeurs invalides."

const contact: Contact = {
  id: ID,
  lastName: "Durand",
  firstName: null,
  restaurant: "Le Comptoir",
  wineTasted: null,
  comment: null,
  lastVisitDate: null,
  createdAt: "2026-11-23T10:00:00.000Z",
}

function form(entries: Record<string, string | File>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(entries)) formData.set(key, value)
  return formData
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("createContact", () => {
  it("transmet au service les valeurs texte du formulaire", async () => {
    vi.mocked(addContact).mockResolvedValue({ ok: true, contact })

    const state = await createContact({}, form({ lastName: "Durand", firstName: "", restaurant: "Le Comptoir" }))

    expect(addContact).toHaveBeenCalledWith({ lastName: "Durand", firstName: "", restaurant: "Le Comptoir" })
    expect(revalidatePath).toHaveBeenCalledWith("/")
    expect(state).toEqual({})
  })

  it("transmet un champ absent comme une chaîne vide", async () => {
    vi.mocked(addContact).mockResolvedValue({ ok: false, errors: { restaurant: "Le restaurant est obligatoire." } })

    const state = await createContact({}, form({ lastName: "Durand" }))

    expect(addContact).toHaveBeenCalledWith({ lastName: "Durand", firstName: "", restaurant: "" })
    expect(state).toEqual({
      errors: { restaurant: "Le restaurant est obligatoire." },
      values: { lastName: "Durand", firstName: "", restaurant: "" },
    })
  })

  it("refuse un fichier à la place d'un texte sans appeler le service", async () => {
    const state = await createContact(
      {},
      form({ lastName: new File(["x"], "nom.txt"), restaurant: "Le Comptoir" }),
    )

    expect(state).toEqual({ formError: FORM_ERROR })
    expect(addContact).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("updateContact", () => {
  it("transmet au service l'id et les valeurs texte, puis revient à la liste", async () => {
    vi.mocked(updateContactDetails).mockResolvedValue({ ok: true, contact })

    await updateContact(ID, {}, form({ wineTasted: "Chablis", comment: "Bien", lastVisitDate: "2026-11-12" }))

    expect(updateContactDetails).toHaveBeenCalledWith(
      ID,
      { wineTasted: "Chablis", comment: "Bien", lastVisitDate: "2026-11-12" },
      expect.any(Date),
    )
    expect(revalidatePath).toHaveBeenCalledWith("/")
    expect(redirect).toHaveBeenCalledWith("/")
  })

  it("renvoie l'erreur du service avec la saisie", async () => {
    vi.mocked(updateContactDetails).mockResolvedValue({
      ok: false,
      reason: "invalid",
      errors: { lastVisitDate: "La date de visite ne peut pas être dans le futur." },
    })

    const state = await updateContact(ID, {}, form({ lastVisitDate: "2027-01-01" }))

    expect(state).toEqual({
      errors: { lastVisitDate: "La date de visite ne peut pas être dans le futur." },
      values: { wineTasted: "", comment: "", lastVisitDate: "2027-01-01" },
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("affiche la page introuvable quand le service ne trouve pas le contact", async () => {
    vi.mocked(updateContactDetails).mockResolvedValue({ ok: false, reason: "notFound" })

    await updateContact("abc", {}, form({ wineTasted: "Chablis" }))

    expect(notFound).toHaveBeenCalled()
  })

  it("refuse un fichier à la place d'un texte sans appeler le service", async () => {
    const state = await updateContact(ID, {}, form({ lastVisitDate: new File(["x"], "date.txt") }))

    expect(state).toEqual({ formError: FORM_ERROR })
    expect(updateContactDetails).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})
