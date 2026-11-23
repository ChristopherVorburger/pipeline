"use server"

import { revalidatePath } from "next/cache"
import type { ContactFormState } from "@/components/contact-form"
import { addContact } from "@/services/contact-service"

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
