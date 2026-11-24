---
paths:
  - "src/app/**/*.{ts,tsx}"
  - "src/components/**/*.{ts,tsx}"
  - "src/services/**/*.ts"
---

# Validation des entrées avec zod

Toute valeur qui entre dans l'app (`FormData`, paramètres d'URL) est validée avec zod. Pas de validation à la main : ni regex, ni `if` champ par champ, ni `String(formData.get(...))`.

## Règles

- Deux niveaux, chacun dans sa couche :
  - **Server actions** (`src/app`) : un schéma zod ne vérifie que la forme du formulaire, avec `safeParse(Object.fromEntries(formData))`. Chaque champ est un texte, un champ absent devient `""`. Aucune règle métier à ce niveau. Si la forme est invalide (un fichier à la place d'un texte, par exemple), l'action renvoie un `formError` générique et n'appelle pas le service.
  - **Champ à valeurs multiples** (cases à cocher qui partagent le même `name`) : `Object.fromEntries` n'en garderait qu'une. Ses valeurs se lisent avec `formData.getAll("<name>")`, puis passent dans le même schéma zod que les autres champs, par exemple `z.array(z.string()).default([])`. Exemple : `safeParse({ ...Object.fromEntries(formData), wineIds: formData.getAll("wineIds") })`. Un test d'action vérifie qu'un fichier à la place d'une valeur renvoie le `formError`.
  - **Services** (`src/services`) : les règles métier sont des schémas zod déclarés dans le service. Exemples : champ obligatoire, date valide, date pas dans le futur, id au format UUID. Les messages d'erreur sont en français. Si une règle dépend de la date du jour, `now` est passé au schéma, jamais lu avec `new Date()`.
- Toujours `safeParse`, jamais `parse` : une saisie invalide renvoie un résultat d'erreur, elle ne lève pas d'exception.
- zod n'est importé que dans les server actions et les services. Pas dans `src/components`, sinon il part dans le bundle client, ni dans `src/data`.
- Les schémas se testent à travers la fonction qui les utilise. Pour une action : au moins un test où un fichier remplace un texte. Pour un service : les cas limites de chaque règle.

## Comment vérifier

Chaque commande ne doit rien afficher.

```bash
# zod n'est importé que dans src/app et src/services
grep -rnE "from ['\"]zod['\"]" src --include=*.ts --include=*.tsx | grep -vE "^src/(app|services)/"

# Aucune lecture brute du FormData (hors tests)
grep -rn "formData.get(" src --include=*.ts --include=*.tsx | grep -vE "\.test\.tsx?:"

# Pas de parse qui lève, safeParse uniquement
grep -rnE "\.parse\(" src/app src/services --include=*.ts | grep -v "\.test\.ts"

# Chaque fichier d'actions et de service importe zod
grep -L "from \"zod\"" $(find src/app -name 'actions.ts') $(find src/services -name '*.ts' ! -name '*.test.ts')
```
