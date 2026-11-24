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

À revoir : la migration du schéma (`ALTER TABLE ADD COLUMN` au démarrage, ajoutée au lot 2) est à revoir pour Turso.

## Lot 6 · Corriger l'étape, l'interlocuteur et le canal d'un contact

Si j'ai cliqué sur « Étape suivante » par erreur, je ramène le contact à l'étape d'avant depuis sa fiche, sans toucher au reste de la fiche. L'interlocuteur et le canal ne sont plus réservés au « premier contact » : je les modifie quelle que soit l'étape, clients compris. Les règles vivent dans le service.

- Étant donné un contact en « dégustation », quand je le ramène à l'étape précédente, alors la liste affiche « premier contact », y compris après un redémarrage.
- Étant donné un client en « commande », quand je le ramène à l'étape précédente, alors il est en « dégustation » et n'est plus client.
- Étant donné un contact en « premier contact », quand j'affiche sa fiche, alors l'action « étape précédente » n'est pas proposée.
- Étant donné un contact ramené à l'étape précédente, quand je rouvre sa fiche, alors interlocuteur, canal, vin, commentaire et date de visite sont inchangés.
- Étant donné la fiche d'un client ouverte dans deux onglets, quand je clique « étape précédente » dans les deux, alors le contact ne recule que d'une étape.
- Étant donné un contact en « dégustation », quand je choisis « patron » et « en personne » puis j'enregistre, alors je les retrouve sur sa fiche après un redémarrage.
- Étant donné un client, quand je change son interlocuteur et son canal puis j'enregistre, alors je retrouve les nouvelles valeurs sur sa fiche.
- Étant donné un contact dont l'interlocuteur est renseigné, quand je le vide puis j'enregistre, alors sa fiche n'affiche plus d'interlocuteur.
- Étant donné un contact avec interlocuteur et canal, quand je le passe à l'étape suivante ou précédente, alors interlocuteur et canal sont conservés.

## Lot 7 · Tenir le catalogue des domaines et de leurs vins

J'ouvre la vue « Catalogue » et j'y ajoute les domaines que je représente, puis les vins de chaque domaine. Les fiches des contacts ne changent pas encore.

- Étant donné un catalogue vide, quand j'ouvre « Catalogue », alors je vois un message « aucun domaine ».
- Étant donné le catalogue, quand j'ajoute un domaine, alors il y apparaît, y compris après un redémarrage.
- Étant donné un domaine, quand j'y ajoute un vin, alors il apparaît sous ce domaine, y compris après un redémarrage.
- Étant donné deux domaines, quand j'ajoute un vin au second, alors il n'apparaît pas sous le premier.
- Étant donné un domaine ou un vin sans nom, quand je valide, alors l'ajout est refusé et le champ manquant est signalé.
- Étant donné un domaine qui existe déjà, ou un vin qui existe déjà dans ce domaine, quand je valide, alors l'ajout est refusé et la raison est affichée.

## Lot 8 · Cocher les vins dégustés sur la fiche d'un contact

Sur la fiche d'un contact, le champ libre « vin dégusté » devient une liste « Vin(s) dégusté(s) » : les vins du catalogue regroupés par domaine, chacun avec une case à cocher. Les anciens textes saisis sont recopiés dans le commentaire. Seule la base locale `pipeline.db` est concernée : il n'y a pas encore de base en production.

- Étant donné un catalogue avec deux domaines, quand j'ouvre la fiche d'un contact, alors je vois « Vin(s) dégusté(s) » avec les vins regroupés par domaine, chacun avec une case à cocher.
- Étant donné deux vins de domaines différents cochés, quand j'enregistre, alors je les retrouve cochés en rouvrant la fiche, y compris après un redémarrage.
- Étant donné un vin coché, quand je le décoche puis j'enregistre, alors il n'est plus coché.
- Étant donné un contact avec des vins dégustés, quand j'affiche la liste, alors elle affiche ces vins avec leur domaine.
- Étant donné un catalogue vide, quand j'ouvre la fiche d'un contact, alors un message m'invite à remplir le catalogue, avec un lien vers lui.
- Étant donné un contact dont l'ancien « vin dégusté » contient « Morgon 2022 » et dont le commentaire est « Rappeler lundi », quand l'app démarre après le lot, alors son commentaire devient « Rappeler lundi » suivi d'une ligne « Vin dégusté : Morgon 2022 ».
- Étant donné un contact dont l'ancien « vin dégusté » contient du texte et dont le commentaire est vide, quand l'app démarre après le lot, alors son commentaire est « Vin dégusté : <texte> ».
- Étant donné l'app redémarrée une seconde fois, quand j'ouvre la fiche, alors le texte n'est pas recopié deux fois.

## Décisions

- Champs obligatoires : nom et restaurant. Le prénom est facultatif.
- Un contact sans aucune visite apparaît dans « À relancer ».
- Interlocuteur (patron ou sommelier) et canal (en personne ou par téléphone) sont deux champs, modifiables à toutes les étapes.
- Retour à l'étape précédente possible, d'une étape à la fois. Un client ramené en dégustation redevient prospect.
- Catalogue : on ajoute des domaines et des vins. Les modifier ou les supprimer est hors périmètre pour l'instant.
- Les anciens « vin dégusté » en texte libre sont recopiés à la fin du commentaire.
- Hors périmètre : authentification, droits, multi-utilisateur, suppression et recherche de contact.
