import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Contact } from "@/services/contact-service"

type ContactListProps = {
  contacts: Contact[]
}

export function ContactList({ contacts }: ContactListProps) {
  if (contacts.length === 0) {
    return <p className="text-muted-foreground">Aucun contact.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl font-normal">
                {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
              </CardTitle>
              <CardDescription>{contact.restaurant}</CardDescription>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  )
}
