import { createClient } from "@libsql/client"
import { createSqliteCatalogRepository } from "@/data/catalog-repository"
import {
  createSqliteContactRepository,
  type Channel,
  type Interlocutor,
  type Stage,
} from "@/data/contact-repository"
import { resolveDatabaseUrl } from "@/data/database-config"
import { migrate } from "@/data/schema"

type SeedContact = {
  lastName: string
  firstName: string | null
  restaurant: string
  stage: Stage
  interlocutor: Interlocutor | null
  channel: Channel | null
  wines: string[]
  comment: string | null
  daysSinceVisit: number | null
}

const CATALOG: Record<string, string[]> = {
  "Domaine de l'Écu": ["Muscadet Granite", "Orthogneiss", "Gros Plant"],
  "Château Montus": ["Madiran Cuvée Prestige", "Pacherenc du Vic-Bilh", "Montus Blanc"],
  "Domaine Huet": ["Vouvray Le Haut-Lieu Sec", "Vouvray Clos du Bourg", "Pétillant Brut"],
  "Clos Rougeard": ["Saumur-Champigny Le Clos", "Les Poyeux"],
  "Mas Jullien": ["Terrasses du Larzac", "États d'Âme", "Autour de Jonquières"],
  "Domaine Ostertag": ["Riesling Fronholz", "Pinot Gris Muenchberg"],
  "Domaine sans vin": [],
}

const CONTACTS: SeedContact[] = [
  {
    lastName: "Martin",
    firstName: "Julie",
    restaurant: "Le Comptoir du Marché",
    stage: "premier_contact",
    interlocutor: null,
    channel: null,
    wines: [],
    comment: null,
    daysSinceVisit: null,
  },
  {
    lastName: "Bernard",
    firstName: null,
    restaurant: "Chez Germaine",
    stage: "premier_contact",
    interlocutor: "patron",
    channel: "telephone",
    wines: [],
    comment: "Rappeler après 15 h, jamais pendant le service.",
    daysSinceVisit: 0,
  },
  {
    lastName: "Dubois",
    firstName: "Antoine",
    restaurant: "La Table d'Antoine",
    stage: "premier_contact",
    interlocutor: "sommelier",
    channel: "en_personne",
    wines: [],
    comment: "Carte très bourguignonne, curieux de la Loire.",
    daysSinceVisit: 7,
  },
  {
    lastName: "Thomas",
    firstName: "Léa",
    restaurant: "Bistrot des Halles",
    stage: "premier_contact",
    interlocutor: "patron",
    channel: "en_personne",
    wines: [],
    comment: null,
    daysSinceVisit: 8,
  },
  {
    lastName: "Robert",
    firstName: "Hugo",
    restaurant: "L'Ardoise",
    stage: "degustation",
    interlocutor: "sommelier",
    channel: "en_personne",
    wines: ["Domaine Huet/Vouvray Le Haut-Lieu Sec", "Clos Rougeard/Les Poyeux"],
    comment: "A beaucoup aimé le Vouvray.\nVeut un prix pour 24 bouteilles.",
    daysSinceVisit: 2,
  },
  {
    lastName: "Richard",
    firstName: "Camille",
    restaurant: "Le Petit Zinc",
    stage: "degustation",
    interlocutor: "patron",
    channel: "telephone",
    wines: ["Mas Jullien/Terrasses du Larzac"],
    comment: "Échantillon envoyé par coursier.",
    daysSinceVisit: 12,
  },
  {
    lastName: "Petit",
    firstName: "Nicolas",
    restaurant: "Brasserie de l'Hôtel de Ville",
    stage: "degustation",
    interlocutor: null,
    channel: "en_personne",
    wines: [
      "Domaine de l'Écu/Muscadet Granite",
      "Domaine de l'Écu/Orthogneiss",
      "Château Montus/Madiran Cuvée Prestige",
      "Domaine Ostertag/Riesling Fronholz",
    ],
    comment: null,
    daysSinceVisit: 30,
  },
  {
    lastName: "Durand",
    firstName: "Sophie",
    restaurant: "Les Papilles",
    stage: "degustation",
    interlocutor: "sommelier",
    channel: null,
    wines: [],
    comment: "Dégustation prévue, vins pas encore choisis.",
    daysSinceVisit: null,
  },
  {
    lastName: "Leroy",
    firstName: "Marc",
    restaurant: "Le Bouchon Lyonnais",
    stage: "commande",
    interlocutor: "patron",
    channel: "en_personne",
    wines: ["Clos Rougeard/Saumur-Champigny Le Clos", "Mas Jullien/États d'Âme"],
    comment: "Première commande : 12 Saumur-Champigny, 6 États d'Âme.",
    daysSinceVisit: 3,
  },
  {
    lastName: "Moreau",
    firstName: "Claire",
    restaurant: "Maison Moreau",
    stage: "commande",
    interlocutor: "sommelier",
    channel: "telephone",
    wines: ["Domaine Huet/Vouvray Clos du Bourg", "Domaine Huet/Pétillant Brut"],
    comment: "Cliente fidèle, réassort tous les mois.",
    daysSinceVisit: 10,
  },
  {
    lastName: "Simon",
    firstName: null,
    restaurant: "Le Quai",
    stage: "commande",
    interlocutor: null,
    channel: null,
    wines: ["Château Montus/Pacherenc du Vic-Bilh"],
    comment: null,
    daysSinceVisit: 45,
  },
  {
    lastName: "Laurent-Fournier",
    firstName: "Élodie",
    restaurant: "Restaurant gastronomique « L'Instant » — Hôtel des Voyageurs, salle du premier étage",
    stage: "premier_contact",
    interlocutor: "sommelier",
    channel: "telephone",
    wines: [],
    comment:
      "Fiche avec des textes longs pour tester la mise en page : la sommelière souhaite une présentation complète de chaque domaine, avec fiches techniques, prix départ et disponibilités sur les trois prochains millésimes, avant tout rendez-vous.",
    daysSinceVisit: 1,
  },
]

const TIME_ZONE = "Europe/Paris"

function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  )
}

function daysBefore(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

async function seed(reset: boolean): Promise<void> {
  const url = resolveDatabaseUrl(process.env)
  if (!url.startsWith("file:")) {
    throw new Error(`Seed refusé : ${url} n'est pas une base locale (file:).`)
  }

  const client = createClient({ url })
  try {
    await migrate(client)
    const { rows } = await client.execute(
      "SELECT (SELECT count(*) FROM contacts) + (SELECT count(*) FROM domains) AS total",
    )
    if (Number(rows[0].total) > 0) {
      if (!reset) {
        throw new Error("La base n'est pas vide. Relance avec --reset pour tout effacer avant le seed.")
      }
      await client.batch(
        ["DELETE FROM contact_wines", "DELETE FROM contacts", "DELETE FROM wines", "DELETE FROM domains"],
        "write",
      )
    }
  } finally {
    client.close()
  }

  const catalog = createSqliteCatalogRepository(url)
  const contacts = createSqliteContactRepository(url)
  try {
    const wineIds = new Map<string, string>()
    for (const [domainName, wines] of Object.entries(CATALOG)) {
      const domain = await catalog.addDomain(domainName)
      if (!domain) throw new Error(`Domaine en double : ${domainName}`)
      for (const wineName of wines) {
        const wine = await catalog.addWine(domain.id, wineName)
        if (!wine) throw new Error(`Vin en double : ${domainName}/${wineName}`)
        wineIds.set(`${domainName}/${wineName}`, wine.id)
      }
    }

    const today = todayIn(TIME_ZONE)
    for (const contact of CONTACTS) {
      const created = await contacts.add(contact)
      await contacts.update(created.id, {
        comment: contact.comment,
        lastVisitDate: contact.daysSinceVisit === null ? null : daysBefore(today, contact.daysSinceVisit),
        interlocutor: contact.interlocutor,
        channel: contact.channel,
        wineIds: contact.wines.map((key) => {
          const id = wineIds.get(key)
          if (!id) throw new Error(`Vin inconnu dans le catalogue : ${key}`)
          return id
        }),
      })
    }

    console.log(`Seed OK (${url}) : ${Object.keys(CATALOG).length} domaines, ${wineIds.size} vins, ${CONTACTS.length} contacts.`)
  } finally {
    catalog.close()
    contacts.close()
  }
}

seed(process.argv.includes("--reset")).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
