"use client"

import { useActionState, useId } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CatalogEntryErrors, CatalogEntryInput } from "@/services/catalog-service"

export type CatalogEntryFormState = {
  errors?: CatalogEntryErrors
  values?: CatalogEntryInput
  formError?: string
}

type CatalogEntryFormProps = {
  label: string
  submitLabel: string
  action: (state: CatalogEntryFormState, formData: FormData) => Promise<CatalogEntryFormState>
}

export function CatalogEntryForm({ label, submitLabel, action }: CatalogEntryFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const id = useId()
  const errorId = `${id}-erreur`
  const error = state.errors?.name

  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          name="name"
          defaultValue={state.values?.name}
          className="flex-1"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {state.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}
    </form>
  )
}
