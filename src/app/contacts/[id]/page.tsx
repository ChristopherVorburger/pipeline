import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateContact } from "@/app/actions";
import { ContactDetailsForm } from "@/components/contact-details-form";
import { ModeToggle } from "@/components/mode-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getContact } from "@/services/contact-service";

async function ContactSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getContact(id);
  if (!result.ok) notFound();
  const { contact } = result;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-3xl">
          {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
        </h2>
        <p className="text-muted-foreground">{contact.restaurant}</p>
      </div>
      <ContactDetailsForm contact={contact} action={updateContact.bind(null, contact.id)} />
    </section>
  );
}

export default function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl">Pipeline</h1>
        <ModeToggle />
      </header>
      <Link href="/" className={buttonVariants({ variant: "link", className: "self-start px-0" })}>
        ← Retour à la liste
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ContactSheet params={params} />
      </Suspense>
    </main>
  );
}
