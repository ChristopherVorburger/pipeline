"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { CatalogDomain } from "@/services/catalog-service"
import type { Contact, ContactDetailsErrors, ContactDetailsInput } from "@/services/contact-service"

export type ContactDetailsFormState = {
  errors?: ContactDetailsErrors
  values?: ContactDetailsInput
  formError?: string
}

type ContactDetailsFormProps = {
  contact: Contact
  catalog: CatalogDomain[]
  action: (state: ContactDetailsFormState, formData: FormData) => Promise<ContactDetailsFormState>
}

type Choice = { value: string | null; label: string }

const NOT_SET: Choice = { value: null, label: "Non renseigné" }

const INTERLOCUTORS: Choice[] = [
  NOT_SET,
  { value: "patron", label: "Patron" },
  { value: "sommelier", label: "Sommelier" },
]

const CHANNELS: Choice[] = [
  NOT_SET,
  { value: "en_personne", label: "En personne" },
  { value: "telephone", label: "Par téléphone" },
]

type ChoiceFieldProps = {
  name: "interlocutor" | "channel"
  label: string
  choices: Choice[]
  defaultValue?: string
  error?: string
}

function ChoiceField({ name, label, choices, defaultValue, error }: ChoiceFieldProps) {
  const id = `contact-${name}`
  const errorId = `${id}-erreur`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select name={name} items={choices} defaultValue={defaultValue || null}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          <SelectValue placeholder="Non renseigné" />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice.value ?? ""} value={choice.value}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

const LEGEND = "font-mono text-[0.7rem] font-medium tracking-wider uppercase"

type WinesFieldProps = {
  catalog: CatalogDomain[]
  checked: string[]
  error?: string
}

function WinesField({ catalog, checked, error }: WinesFieldProps) {
  const checkedIds = new Set(checked)

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? "contact-wineIds-erreur" : undefined}>
      <legend className={`${LEGEND} mb-2`}>Vin(s) dégusté(s)</legend>
      {catalog.length === 0 ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Le catalogue est vide.
          <Link href="/catalogue" className={buttonVariants({ variant: "link", size: "sm", className: "px-0" })}>
            Remplir le catalogue
          </Link>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {catalog.map((domain) => (
            <fieldset key={domain.id} className="flex flex-col gap-2">
              <legend className="mb-1 font-heading text-lg">{domain.name}</legend>
              {domain.wines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun vin.</p>
              ) : (
                domain.wines.map((wine) => (
                  <Label key={wine.id} className="font-sans text-sm font-normal tracking-normal normal-case">
                    <Checkbox name="wineIds" value={wine.id} defaultChecked={checkedIds.has(wine.id)} />
                    {wine.name}
                  </Label>
                ))
              )}
            </fieldset>
          ))}
        </div>
      )}
      {error && (
        <p id="contact-wineIds-erreur" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export function ContactDetailsForm({ contact, catalog, action }: ContactDetailsFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const values = state.values ?? {
    wineIds: contact.winesTasted.map((wine) => wine.id),
    comment: contact.comment ?? "",
    lastVisitDate: contact.lastVisitDate ?? "",
    interlocutor: contact.interlocutor ?? "",
    channel: contact.channel ?? "",
  }
  const dateError = state.errors?.lastVisitDate

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceField
          name="interlocutor"
          label="Interlocuteur"
          choices={INTERLOCUTORS}
          defaultValue={values.interlocutor}
          error={state.errors?.interlocutor}
        />
        <ChoiceField
          name="channel"
          label="Canal"
          choices={CHANNELS}
          defaultValue={values.channel}
          error={state.errors?.channel}
        />
      </div>
      <WinesField
        key={values.wineIds?.join(",")}
        catalog={catalog}
        checked={values.wineIds ?? []}
        error={state.errors?.wineIds}
      />
      <div className="grid gap-4 sm:grid-cols-2">
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
