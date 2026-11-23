import { Suspense } from "react";
import { connection } from "next/server";
import { createContact } from "@/app/actions";
import { ContactForm } from "@/components/contact-form";
import { ContactList } from "@/components/contact-list";
import { ModeToggle } from "@/components/mode-toggle";
import { listContacts } from "@/services/contact-service";

async function Contacts() {
  await connection();
  const contacts = await listContacts();

  return <ContactList contacts={contacts} />;
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl">Pipeline</h1>
        <ModeToggle />
      </header>
      <ContactForm action={createContact} />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Contacts />
      </Suspense>
    </main>
  );
}
