// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import { createDomain, createWine } from "@/app/catalogue/actions"
import { addDomain, addWine } from "@/services/catalog-service"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ notFound: vi.fn() }))
vi.mock("@/services/catalog-service", () => ({ addDomain: vi.fn(), addWine: vi.fn() }))

const DOMAIN_ID = "6a1f0c2e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"
const FORM_ERROR = "Le formulaire contient des valeurs invalides."
const domain = { id: DOMAIN_ID, name: "Domaine Dupont", createdAt: "2026-11-24T10:00:00.000Z" }

function form(entries: Record<string, string | File>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(entries)) formData.set(key, value)
  return formData
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("createDomain", () => {
  it("transmet le nom au service puis rafraîchit le catalogue", async () => {
    vi.mocked(addDomain).mockResolvedValue({ ok: true, domain })

    const state = await createDomain({}, form({ name: "Domaine Dupont" }))

    expect(addDomain).toHaveBeenCalledWith({ name: "Domaine Dupont" })
    expect(revalidatePath).toHaveBeenCalledWith("/catalogue")
    expect(state).toEqual({})
  })

  it("renvoie l'erreur du service avec la saisie, un champ absent devenant vide", async () => {
    vi.mocked(addDomain).mockResolvedValue({ ok: false, errors: { name: "Le nom du domaine est obligatoire." } })

    const state = await createDomain({}, form({}))

    expect(addDomain).toHaveBeenCalledWith({ name: "" })
    expect(state).toEqual({ errors: { name: "Le nom du domaine est obligatoire." }, values: { name: "" } })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuse un fichier à la place d'un texte sans appeler le service", async () => {
    const state = await createDomain({}, form({ name: new File(["x"], "x.txt") }))

    expect(state).toEqual({ formError: FORM_ERROR })
    expect(addDomain).not.toHaveBeenCalled()
  })
})

describe("createWine", () => {
  it("transmet le domaine et le nom au service puis rafraîchit le catalogue", async () => {
    vi.mocked(addWine).mockResolvedValue({
      ok: true,
      wine: { id: crypto.randomUUID(), domainId: DOMAIN_ID, name: "Chablis", createdAt: "2026-11-24T10:00:00.000Z" },
    })

    const state = await createWine(DOMAIN_ID, {}, form({ name: "Chablis" }))

    expect(addWine).toHaveBeenCalledWith(DOMAIN_ID, { name: "Chablis" })
    expect(revalidatePath).toHaveBeenCalledWith("/catalogue")
    expect(state).toEqual({})
  })

  it("renvoie l'erreur du service avec la saisie", async () => {
    vi.mocked(addWine).mockResolvedValue({
      ok: false,
      reason: "invalid",
      errors: { name: "Ce vin existe déjà dans ce domaine." },
    })

    const state = await createWine(DOMAIN_ID, {}, form({ name: "Chablis" }))

    expect(state).toEqual({ errors: { name: "Ce vin existe déjà dans ce domaine." }, values: { name: "Chablis" } })
  })

  it("affiche la page introuvable quand le domaine n'existe pas", async () => {
    vi.mocked(addWine).mockResolvedValue({ ok: false, reason: "notFound" })

    await createWine("abc", {}, form({ name: "Chablis" }))

    expect(notFound).toHaveBeenCalled()
  })

  it("refuse un fichier à la place d'un texte sans appeler le service", async () => {
    const state = await createWine(DOMAIN_ID, {}, form({ name: new File(["x"], "x.txt") }))

    expect(state).toEqual({ formError: FORM_ERROR })
    expect(addWine).not.toHaveBeenCalled()
  })
})
