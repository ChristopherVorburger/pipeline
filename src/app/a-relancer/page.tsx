import { Suspense } from "react";
import { connection } from "next/server";
import { ContactList } from "@/components/contact-list";
import { MainNav } from "@/components/main-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { listContactsToFollowUp } from "@/services/contact-service";

async function ContactsToFollowUp() {
  await connection();
  const contacts = await listContactsToFollowUp(new Date());

  return <ContactList contacts={contacts} emptyMessage="Personne à relancer." />;
}

export default function FollowUpPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl">Pipeline</h1>
        <ModeToggle />
      </header>
      <MainNav current="followUp" />
      <h2 className="font-heading text-3xl">À relancer</h2>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ContactsToFollowUp />
      </Suspense>
    </main>
  );
}
