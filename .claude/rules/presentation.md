---
paths:
  - "src/app/**/*.{ts,tsx}"
  - "src/components/**/*.{ts,tsx}"
---

# Couche présentation

Pages, layouts et composants sous `src/app` et `src/components`.

## Règles

- Aucune règle métier ici : pas de calcul d'étape, de passage en client ni de délai de relance. Le composant affiche ce que le service renvoie.
- Pour l'interface, on n'utilise que les composants du design system (`@/components/ui`, à voir sur la route `/design-system`). Pas de `<button>`, `<input>`, `<select>` ni `<textarea>` en HTML brut.
- Il manque un composant ? On l'ajoute avec `pnpm dlx shadcn@latest add <nom>`, puis on l'aligne sur le thème Étiquette (libellés en mono capitales).
- Aucune couleur en dur : pas de hex, `rgb()`, `oklch()`, classes de palette Tailwind (`bg-red-500`, `text-white`…) ni valeurs arbitraires (`text-[#…]`). On n'utilise que les tokens du thème : `bg-primary`, `text-muted-foreground`, `bg-warning`…
- Il manque une couleur ? On ajoute un token dans `src/app/globals.css`, en clair et en sombre, et on vérifie son contraste WCAG.
- Chaque composant est testé avec Testing Library, dans un `*.test.tsx` placé à côté de lui.

## Comment vérifier

Chaque commande ne doit rien afficher.

```bash
# Aucune couleur en dur (hors src/components/ui)
grep -rnE "#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab)\(|-\[#|\b(bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|placeholder|caret|accent|shadow)-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b" src/app src/components --include=*.ts --include=*.tsx | grep -v "src/components/ui/"

# Aucun élément de formulaire en HTML brut (hors src/components/ui)
grep -rnE "<(button|input|select|textarea)\b" src/app src/components --include=*.tsx | grep -v "src/components/ui/"
```

Ensuite :
- `pnpm test --run`, `pnpm lint` et `pnpm build` passent ;
- l'écran s'affiche correctement en clair et en sombre (sélecteur en haut à droite).
