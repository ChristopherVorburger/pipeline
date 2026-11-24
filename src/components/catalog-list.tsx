import { CatalogEntryForm, type CatalogEntryFormState } from "@/components/catalog-entry-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CatalogDomain } from "@/services/catalog-service"

type WineAction = (state: CatalogEntryFormState, formData: FormData) => Promise<CatalogEntryFormState>

type CatalogListProps = {
  domains: CatalogDomain[]
  wineActionFor: (domainId: string) => WineAction
}

export function CatalogList({ domains, wineActionFor }: CatalogListProps) {
  if (domains.length === 0) {
    return <p className="text-muted-foreground">Aucun domaine.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {domains.map((domain) => (
        <li key={domain.id}>
          <Card role="region" aria-labelledby={`domaine-${domain.id}`}>
            <CardHeader>
              <CardTitle id={`domaine-${domain.id}`} className="font-heading text-2xl font-normal">
                {domain.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {domain.wines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun vin.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {domain.wines.map((wine) => (
                    <li key={wine.id}>{wine.name}</li>
                  ))}
                </ul>
              )}
              <CatalogEntryForm label="Nouveau vin" submitLabel="Ajouter le vin" action={wineActionFor(domain.id)} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
