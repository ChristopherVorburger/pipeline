import { Suspense } from "react";
import { connection } from "next/server";
import { createDomain, createWine } from "@/app/catalogue/actions";
import { CatalogEntryForm } from "@/components/catalog-entry-form";
import { CatalogList } from "@/components/catalog-list";
import { MainNav } from "@/components/main-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { listCatalog } from "@/services/catalog-service";

async function Catalog() {
  await connection();
  const domains = await listCatalog();

  return <CatalogList domains={domains} wineActionFor={(domainId) => createWine.bind(null, domainId)} />;
}

export default function CatalogPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl">Pipeline</h1>
        <ModeToggle />
      </header>
      <MainNav current="catalog" />
      <h2 className="font-heading text-3xl">Catalogue</h2>
      <CatalogEntryForm label="Nouveau domaine" submitLabel="Ajouter le domaine" action={createDomain} />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Catalog />
      </Suspense>
    </main>
  );
}
