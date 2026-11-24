"use server"

import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import * as z from "zod"
import type { CatalogEntryFormState } from "@/components/catalog-entry-form"
import { addDomain, addWine } from "@/services/catalog-service"

const FORM_ERROR = "Le formulaire contient des valeurs invalides."

const catalogEntryForm = z.object({
  name: z.string().default(""),
})

export async function createDomain(
  _state: CatalogEntryFormState,
  formData: FormData,
): Promise<CatalogEntryFormState> {
  const parsed = catalogEntryForm.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { formError: FORM_ERROR }
  const values = parsed.data

  const result = await addDomain(values)
  if (!result.ok) return { errors: result.errors, values }

  revalidatePath("/catalogue")
  return {}
}

export async function createWine(
  domainId: string,
  _state: CatalogEntryFormState,
  formData: FormData,
): Promise<CatalogEntryFormState> {
  const parsed = catalogEntryForm.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { formError: FORM_ERROR }
  const values = parsed.data

  const result = await addWine(domainId, values)
  if (!result.ok) {
    if (result.reason === "notFound") notFound()
    return { errors: result.errors, values }
  }

  revalidatePath("/catalogue")
  return {}
}
