"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Contact, ContactDetailsErrors, ContactDetailsInput } from "@/services/contact-service"

export type ContactDetailsFormState = {
  errors?: ContactDetailsErrors
  values?: ContactDetailsInput
  formError?: string
}

type ContactDetailsFormProps = {
  contact: Contact
  action: (state: ContactDetailsFormState, formData: FormData) => Promise<ContactDetailsFormState>
}

export function ContactDetailsForm({ contact, action }: ContactDetailsFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const values = state.values ?? {
    wineTasted: contact.wineTasted ?? "",
    comment: contact.comment ?? "",
    lastVisitDate: contact.lastVisitDate ?? "",
  }
  const dateError = state.errors?.lastVisitDate

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-wineTasted">Vin dégusté</Label>
          <Input id="contact-wineTasted" name="wineTasted" defaultValue={values.wineTasted} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-lastVisitDate">Dernière visite</Label>
          <Input
            id="contact-lastVisitDate"
            name="lastVisitDate"
            type="date"
            defaultValue={values.lastVisitDate}
            aria-invalid={dateError ? true : undefined}
            aria-describedby={dateError ? "contact-lastVisitDate-erreur" : undefined}
          />
          {dateError && (
            <p id="contact-lastVisitDate-erreur" className="text-sm text-destructive">
              {dateError}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-comment">Commentaire</Label>
        <Textarea id="contact-comment" name="comment" defaultValue={values.comment} />
      </div>
      {state.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  )
}
