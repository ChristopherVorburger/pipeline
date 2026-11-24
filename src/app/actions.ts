"use server"

import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import type { ContactDetailsFormState } from "@/components/contact-details-form"
import type { ContactFormState } from "@/components/contact-form"
import { addContact, updateContactDetails } from "@/services/contact-service"

export async function createContact(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = {
    lastName: String(formData.get("lastName") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    restaurant: String(formData.get("restaurant") ?? ""),
  }

  const result = await addContact(values)
  if (!result.ok) {
    return { errors: result.errors, values }
  }

  revalidatePath("/")
  return {}
}

export async function updateContact(
  id: string,
  _state: ContactDetailsFormState,
  formData: FormData,
): Promise<ContactDetailsFormState> {
  const values = {
    wineTasted: String(formData.get("wineTasted") ?? ""),
    comment: String(formData.get("comment") ?? ""),
    lastVisitDate: String(formData.get("lastVisitDate") ?? ""),
  }

  const result = await updateContactDetails(id, values, new Date())
  if (!result.ok) {
    if (result.reason === "notFound") notFound()
    return { errors: result.errors, values }
  }

  revalidatePath("/")
  revalidatePath(`/contacts/${id}`)
  redirect("/")
}
