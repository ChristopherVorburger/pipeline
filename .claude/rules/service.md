---
paths:
  - "src/services/**/*.ts"
---

# Couche service

Règles métier sous `src/services`.

## Règles

- Les règles métier vivent ici et nulle part ailleurs, d'après `INTENT.md` :
  - les étapes : premier contact → dégustation → commande ;
  - le passage en client après une commande ;
  - la relance quand la dernière visite date de plus de 7 jours, clients compris.
- Le service dépend des interfaces de repository de `@/data`. Le repository est passé en paramètre, ce qui permet de tester avec un faux.
- La date du jour est passée en paramètre (`now: Date`), jamais lue en dur avec `new Date()` dans la règle. Le calcul des 7 jours reste ainsi testable.
- Pas d'import de React ni de Next.js.
- Les tests sont écrits avant le code :
  1. écrire le test dans `*.test.ts`, à côté du fichier ;
  2. le lancer et le voir échouer pour la bonne raison ;
  3. écrire le code minimal qui le fait passer ;
  4. nettoyer, les tests restent verts.
- Chaque règle métier a ses cas limites testés. Pour la relance : exactement 7 jours, 8 jours, un client, aucune visite.

## Comment vérifier

```bash
# Tous les tests du service passent
pnpm test --run src/services

# Chaque fichier de service a son test (ne doit rien afficher)
for f in $(find src/services -name '*.ts' ! -name '*.test.ts'); do [ -f "${f%.ts}.test.ts" ] || echo "Sans test : $f"; done

# Aucun import de React ni de Next.js (ne doit rien afficher)
grep -rnE "\b(import|from)\b.*['\"](react|next)(/|['\"])" src/services
```

Pour le « test avant le code » : dans la session, le test a été lancé et vu en échec avant que l'implémentation soit écrite. On montre la sortie rouge, puis la sortie verte, à la revue.
