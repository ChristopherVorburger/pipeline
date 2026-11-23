import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Design system · Pipeline",
};

const colors = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "muted-foreground", className: "bg-muted-foreground" },
  { name: "accent", className: "bg-accent" },
  { name: "warning", className: "bg-warning" },
  { name: "destructive", className: "bg-destructive" },
  { name: "border", className: "bg-border" },
  { name: "input", className: "bg-input" },
  { name: "ring", className: "bg-ring" },
];

const stages = [
  { value: "premier-contact", label: "Premier contact" },
  { value: "degustation", label: "Dégustation" },
  { value: "commande", label: "Commande" },
];

const currentStageIndex = stages.findIndex((stage) => stage.value === "degustation");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t pt-6">
      <h2 className="text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-4 pb-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/" className="font-mono text-xs tracking-wider text-muted-foreground uppercase hover:text-foreground">
            ← Pipeline
          </Link>
          <h1 className="text-5xl">Design system</h1>
          <p className="text-muted-foreground">
            Étiquette : papier, encre, ocre. Tokens shadcn de <code className="font-mono text-sm">globals.css</code>.
          </p>
        </div>
        <ModeToggle />
      </header>

      <Section title="Couleurs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((color) => (
            <div key={color.name} className="flex flex-col gap-1.5">
              <div className={`h-14 rounded-md border ${color.className}`} />
              <span className="font-mono text-xs">{color.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typographie">
        <div className="flex flex-col gap-3">
          <p className="text-5xl font-heading">À relancer aujourd&apos;hui</p>
          <p className="text-3xl font-heading">Camille Roux</p>
          <p className="max-w-prose">
            Dégustation chez Camille Roux, retour très positif sur le blanc. Repasser avec la cuvée rouge.
          </p>
          <p className="text-sm text-muted-foreground">Dernière visite le 10 novembre 2026</p>
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Vin dégusté</p>
        </div>
        <dl className="grid gap-2 font-mono text-xs text-muted-foreground sm:grid-cols-3">
          <div><dt className="text-foreground">Titres</dt><dd>Instrument Serif</dd></div>
          <div><dt className="text-foreground">Texte</dt><dd>IBM Plex Sans</dd></div>
          <div><dt className="text-foreground">Libellés, boutons</dt><dd>IBM Plex Mono</dd></div>
        </dl>
      </Section>

      <Section title="Boutons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Étape suivante</Button>
          <Button variant="secondary">Modifier</Button>
          <Button variant="outline">Annuler</Button>
          <Button variant="ghost">Voir</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button variant="link">Lien</Button>
          <Button disabled>Désactivé</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button>Default</Button>
          <Button size="lg">LG</Button>
        </div>
      </Section>

      <Section title="Champs">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-prenom">Prénom</Label>
            <Input id="ds-prenom" defaultValue="Camille" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-nom">Nom</Label>
            <Input id="ds-nom" placeholder="Nom de famille" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-restaurant">Restaurant</Label>
            <Input id="ds-restaurant" aria-invalid aria-describedby="ds-restaurant-erreur" placeholder="Nom du restaurant" />
            <p id="ds-restaurant-erreur" className="text-sm text-destructive">
              Le nom du restaurant est obligatoire.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-etape">Étape</Label>
            <Select items={stages} defaultValue="degustation">
              <SelectTrigger id="ds-etape" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ds-commentaire">Commentaire</Label>
            <Textarea id="ds-commentaire" placeholder="Ce qui s'est dit, la suite à donner…" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-desactive">Désactivé</Label>
            <Input id="ds-desactive" disabled defaultValue="Non modifiable" />
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Premier contact</Badge>
          <Badge variant="secondary">Dégustation</Badge>
          <Badge>Commande</Badge>
          <Badge className="bg-accent text-accent-foreground">Client</Badge>
          <Badge className="bg-warning text-warning-foreground">À relancer</Badge>
          <Badge variant="destructive">Erreur</Badge>
        </div>
      </Section>

      <Section title="Carte de contact">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="font-heading text-3xl font-normal">Camille Roux</CardTitle>
            <CardDescription>Sommelière · Le Comptoir des Halles</CardDescription>
            <CardAction>
              <Badge variant="secondary">Dégustation</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                {stages.map((stage, index) => (
                  <span
                    key={stage.value}
                    className={`h-1 flex-1 ${index <= currentStageIndex ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
              <div className="flex justify-between font-mono text-[0.65rem] text-muted-foreground">
                {stages.map((stage) => (
                  <span key={stage.value}>{stage.label}</span>
                ))}
              </div>
            </div>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="font-mono text-[0.65rem] tracking-wider text-muted-foreground uppercase">Vin dégusté</dt>
                <dd>Saumur-Champigny 2022</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.65rem] tracking-wider text-muted-foreground uppercase">Commentaire</dt>
                <dd>Aime le fruit, cherche un rouge léger pour l&apos;été.</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-2 border-t py-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-warning text-warning-foreground">À relancer</Badge>
              <span className="font-mono text-xs text-muted-foreground">vu il y a 9 jours</span>
            </div>
            <Button>Étape suivante</Button>
          </CardFooter>
        </Card>
      </Section>
    </main>
  );
}
