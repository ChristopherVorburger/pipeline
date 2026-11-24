import Link from "next/link"
import { StageBadge } from "@/components/stage-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Contact } from "@/services/contact-service"

type ContactListProps = {
  contacts: Contact[]
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-")
  return `${day}/${month}/${year}`
}

export function ContactList({ contacts }: ContactListProps) {
  if (contacts.length === 0) {
    return <p className="text-muted-foreground">Aucun contact.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <Link
            href={`/contacts/${contact.id}`}
            className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle className="font-heading text-2xl font-normal">
                  {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                </CardTitle>
                <CardDescription>{contact.restaurant}</CardDescription>
                <StageBadge stage={contact.stage} isClient={contact.isClient} />
              </CardHeader>
              {(contact.lastVisitDate || contact.wineTasted) && (
                <CardContent className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs tracking-wider uppercase text-muted-foreground">
                  {contact.lastVisitDate && <span>Dernière visite · {formatDate(contact.lastVisitDate)}</span>}
                  {contact.wineTasted && <span>Vin · {contact.wineTasted}</span>}
                </CardContent>
              )}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
