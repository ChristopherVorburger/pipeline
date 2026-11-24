"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ContactErrors, ContactInput } from "@/services/contact-service"

export type ContactFormState = {
  errors?: ContactErrors
  values?: ContactInput
  formError?: string
}

type ContactFormProps = {
  action: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>
}

type FieldProps = {
  name: keyof ContactInput
  label: string
  defaultValue?: string
  error?: string
}

function Field({ name, label, defaultValue, error }: FieldProps) {
  const id = `contact-${name}`
  const errorId = `${id}-erreur`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function ContactForm({ action }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="lastName" label="Nom" defaultValue={state.values?.lastName} error={state.errors?.lastName} />
        <Field name="firstName" label="Prénom" defaultValue={state.values?.firstName} />
        <Field
          name="restaurant"
          label="Restaurant"
          defaultValue={state.values?.restaurant}
          error={state.errors?.restaurant}
        />
      </div>
      {state.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        Ajouter
      </Button>
    </form>
  )
}
