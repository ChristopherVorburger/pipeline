# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Projet

Mini CRM de prospection mono-utilisateur. L'intention, les règles métier et les critères d'acceptation sont dans `INTENT.md` : c'est la référence, à relire avant tout travail.

## Commandes

Gestionnaire : **pnpm** uniquement (`packageManager: pnpm@12.18.0`).

- `pnpm dev` : serveur de dev (http://localhost:3000)
- `pnpm build` : build de production, vérifie aussi les types
- `pnpm lint` : ESLint (flat config, `eslint-config-next`)

Aucun framework de test n'est encore installé.

## Stack

- Next.js 16 (App Router, code sous `src/app`), React 19, TypeScript, alias `@/*` → `src/*`.
- Tailwind CSS 4 : pas de `tailwind.config`, la config et les tokens de thème sont dans `src/app/globals.css`.
- shadcn style `base-nova` : les composants reposent sur `@base-ui/react` (pas Radix), et `cn` vient du paquet npm `cn` (pas `clsx` + `tailwind-merge`). Ajouter un composant : `pnpm dlx shadcn@latest add <nom>`, il arrive dans `src/components/ui`.

## Architecture visée (INTENT.md)

- Trois couches : présentation → service → données. Seule la couche données accède à la base.
- Changer de base (SQLite en local, Turso en production) ne doit modifier que la couche données.
- Les règles métier (étapes, passage en client, relance au-delà de 7 jours) vivent dans la couche service et ont des tests unitaires.
- Pas d'authentification dans l'app : l'accès est restreint au niveau de l'hébergement (Vercel).

## Git

- On travaille sur `dev`. `main` est la branche par défaut du repo GitHub public.
- Repo public : les fichiers `.env*` (sauf `.env.example`) et les bases SQLite (`*.db*`) sont ignorés et ne doivent jamais être commités.
