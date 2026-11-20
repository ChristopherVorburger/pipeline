---
paths:
  - "src/data/**/*.ts"
---

# Couche données

Accès à la base sous `src/data`.

## Règles

- C'est la seule couche qui parle à la base : client SQLite en local, Turso en production. Aucun autre dossier n'importe le client de base.
- Elle expose des interfaces de repository et leurs implémentations. Le reste de l'app ne dépend que des interfaces.
- Aucune règle métier : pas de « 7 jours » ni de logique d'étape dans les requêtes. Le service calcule, par exemple une date limite, et la passe au repository en paramètre.
- C'est ici qu'on choisit l'implémentation (en mémoire, SQLite ou Turso). Changer de base ne modifie que `src/data`, plus les dépendances et `.env.example`.
- Les identifiants de connexion viennent des variables d'environnement. Jamais de secret dans le code : le repo est public.
- Seul `.env.example`, sans valeurs réelles, est versionné. Les bases `*.db*` restent ignorées.
- Les requêtes sont paramétrées, jamais de SQL construit par concaténation.
- Chaque repository a ses tests, qui tournent sur une base en mémoire ou SQLite temporaire, jamais sur une vraie base.

## Comment vérifier

```bash
# Tous les tests de la couche données passent
pnpm test --run src/data

# Le client de base n'est importé que dans src/data (ne doit rien afficher)
grep -rnE "from ['\"](@libsql|better-sqlite3|drizzle-orm)" src --include=*.ts --include=*.tsx | grep -v "^src/data/"

# Seuls les services importent la couche données (ne doit rien afficher)
grep -rnE "from ['\"]@/data" src --include=*.ts --include=*.tsx | grep -vE "^src/(services|data)/"

# Aucun secret ni base suivi par git (ne doit rien afficher)
git ls-files | grep -E "\.env($|\.)|\.db" | grep -v "\.env\.example$"
```

Après un changement de base, `git diff --stat` ne doit montrer que `src/data/`, `package.json`, `pnpm-lock.yaml` et `.env.example`.
