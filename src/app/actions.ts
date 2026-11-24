"use server"

import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import * as z from "zod"
import type { ContactDetailsFormState } from "@/components/contact-details-form"
import type { ContactFormState } from "@/components/contact-form"
import { addContact, advanceContactStage, revertContactStage, updateContactDetails } from "@/services/contact-service"

const FORM_ERROR = "Le formulaire contient des valeurs invalides."

const formText = z.string().default("")

const contactForm = z.object({
  lastName: formText,
  firstName: formText,
  restaurant: formText,
})

const contactDetailsForm = z.object({
  wineIds: z.array(z.string()).default([]),
  comment: formText,
  lastVisitDate: formText,
  interlocutor: formText,
  channel: formText,
})

export async function createContact(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactForm.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { formError: FORM_ERROR }
  const values = parsed.data

  const result = await addContact(values)
  if (!result.ok) {
    return { errors: result.errors, values }
  }

  revalidatePath("/")
  revalidatePath("/a-relancer")
  return {}
}

export async function updateContact(
  id: string,
  _state: ContactDetailsFormState,
  formData: FormData,
): Promise<ContactDetailsFormState> {
  const parsed = contactDetailsForm.safeParse({ ...Object.fromEntries(formData), wineIds: formData.getAll("wineIds") })
  if (!parsed.success) return { formError: FORM_ERROR }
  const values = parsed.data

  const result = await updateContactDetails(id, values, new Date())
  if (!result.ok) {
    if (result.reason === "notFound") notFound()
    return { errors: result.errors, values }
  }

  revalidatePath("/")
  revalidatePath("/a-relancer")
  revalidatePath(`/contacts/${id}`)
  redirect("/")
}

export async function advanceContact(id: string): Promise<void> {
  const result = await advanceContactStage(id)
  if (!result.ok && result.reason === "notFound") notFound()

  revalidatePath("/")
  revalidatePath("/a-relancer")
  revalidatePath(`/contacts/${id}`)
}

export async function revertContact(id: string): Promise<void> {
  const result = await revertContactStage(id)
  if (!result.ok && result.reason === "notFound") notFound()

  revalidatePath("/")
  revalidatePath("/a-relancer")
  revalidatePath(`/contacts/${id}`)
}
