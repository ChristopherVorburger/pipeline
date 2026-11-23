# Lots · Pipeline

Découpage de `INTENT.md` en lots livrables de bout en bout, de l'écran à la base. Le lot 1 est le plus petit.

## Lot 1 · Ajouter un contact et le retrouver dans la liste

J'ouvre Pipeline, je saisis nom, prénom (facultatif) et restaurant, puis je valide. Le contact apparaît dans la liste et y reste après un redémarrage (SQLite en local).

- Étant donné une liste vide, quand j'ouvre l'app, alors je vois un message « aucun contact ».
- Étant donné le formulaire rempli avec nom et restaurant, quand je valide, alors le contact apparaît dans la liste.
- Étant donné un contact ajouté, quand je redémarre l'app, alors il est toujours dans la liste.
- Étant donné un formulaire sans nom ou sans restaurant, quand je valide, alors l'ajout est refusé et le champ manquant est signalé.

## Lot 2 · Compléter la fiche d'un contact

Depuis la liste, j'ouvre un contact et je renseigne ou modifie le vin dégusté, le commentaire et la date de la dernière visite. J'enregistre, et la liste affiche les nouvelles valeurs.

- Étant donné un contact existant, quand je saisis un vin dégusté et un commentaire puis j'enregistre, alors je les retrouve en rouvrant la fiche.
- Étant donné un contact, quand je règle la date de dernière visite au 12/11, alors la liste affiche cette date.
- Étant donné une fiche modifiée, quand je redémarre l'app, alors les modifications sont toujours là.
- Étant donné une date de visite dans le futur, quand j'enregistre, alors elle est refusée.

## Lot 3 · Faire avancer un contact d'étape

Un contact créé démarre à « premier contact ». J'y note l'interlocuteur (patron ou sommelier) et le canal (en personne ou par téléphone). Je le passe ensuite à l'étape suivante (dégustation, puis commande), et à la commande il devient client.

- Étant donné un nouveau contact, quand il apparaît dans la liste, alors son étape est « premier contact ».
- Étant donné un contact en « premier contact », quand je choisis « sommelier » et « par téléphone » puis j'enregistre, alors je les retrouve sur sa fiche après un redémarrage.
- Étant donné un contact en « premier contact », quand je le passe à l'étape suivante, alors la liste affiche « dégustation », y compris après un redémarrage.
- Étant donné un contact en « dégustation », quand je le passe à l'étape suivante, alors il est en « commande » et devient client.
- Étant donné un client, quand j'affiche sa fiche, alors l'action « étape suivante » n'est plus proposée.

## Lot 4 · Voir qui relancer aujourd'hui

J'ouvre la vue « À relancer » et j'y vois les contacts sans visite depuis plus de 7 jours, clients compris, ainsi que ceux qui n'ont jamais eu de visite. Le service calcule la date limite à partir de `now`, et le repository se contente de filtrer.

- Étant donné une dernière visite il y a 8 jours, quand j'ouvre « À relancer », alors le contact y figure.
- Étant donné une dernière visite il y a exactement 7 jours, quand j'ouvre « À relancer », alors il n'y figure pas.
- Étant donné un client sans visite depuis 10 jours, quand j'ouvre « À relancer », alors il y figure.
- Étant donné un contact sans aucune date de visite, quand j'ouvre « À relancer », alors il y figure.
- Étant donné un contact à relancer dont je mets la date de visite à aujourd'hui, quand je reviens sur « À relancer », alors il n'y est plus.

## Lot 5 · Utiliser Pipeline en production

J'ouvre l'URL Vercel, dont l'accès est restreint par Vercel (pas d'authentification dans l'app). J'ajoute un contact et je le retrouve à la visite suivante. La base est Turso.

- Étant donné l'app déployée sur Vercel, quand j'ajoute un contact, alors il est toujours là après un redéploiement.
- Étant donné le passage de SQLite à Turso, quand je lance `git diff --stat`, alors seuls `src/data/`, `package.json`, `pnpm-lock.yaml` et `.env.example` changent.
- Étant donné le repo public, quand je lance `git ls-files`, alors aucun `.env` ni `*.db` n'est suivi, et les identifiants Turso ne viennent que des variables d'environnement Vercel.
- Étant donné un visiteur non autorisé, quand il ouvre l'URL, alors Vercel bloque l'accès avant l'app.

## Décisions

- Champs obligatoires : nom et restaurant. Le prénom est facultatif.
- Un contact sans aucune visite apparaît dans « À relancer ».
- Interlocuteur (patron ou sommelier) et canal (en personne ou par téléphone) sont deux champs, saisis à l'étape « premier contact ».
- Pas de retour à l'étape précédente.
- Hors périmètre : authentification, droits, multi-utilisateur, suppression et recherche de contact.
