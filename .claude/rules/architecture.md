# Architecture : interdits entre couches

Valables partout dans `src`, quel que soit le dossier touché (`src/lib`, `src/proxy.ts`, nouveau dossier…).

## Interdits

- Seul `src/data` parle à la base. Aucun autre fichier n'importe un client de base (`@libsql/*`, `@tursodatabase/*`, `better-sqlite3`, `drizzle-orm`, `node:sqlite`), même en import dynamique.
- La présentation (`src/app`, `src/components`) n'appelle que les services (`@/services/...`). Même les types passent par le service.
- Seuls les services importent `src/data`, sous n'importe quelle forme : `@/data`, `src/data`, `../data`, `./data` ou `import("…/data")`.

## Comment vérifier

Chaque commande ne doit rien afficher.

```bash
# Seul src/data importe un client de base
grep -rnE "\b(import|from|require)\b.*['\"](@libsql/|@tursodatabase/|better-sqlite3|drizzle-orm|node:sqlite)" src --include=*.ts --include=*.tsx | grep -v "^src/data/"

# La présentation n'importe pas la couche données
grep -rnE "\b(import|from)\b.*['\"](@/|(\.\.?/)+|([^'\"]*/)?src/)data(/|['\"])" src/app src/components --include=*.ts --include=*.tsx

# Seuls les services importent la couche données
grep -rnE "\b(import|from)\b.*['\"](@/|(\.\.?/)+|([^'\"]*/)?src/)data(/|['\"])" src --include=*.ts --include=*.tsx | grep -vE "^src/(services|data)/"
```
