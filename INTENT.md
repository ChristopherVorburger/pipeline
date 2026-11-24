# Intention · Pipeline

## Produit

Un mini CRM de prospection pour une seule personne.
Je note mes contacts, je les fais avancer d'étape en étape, je sais qui relancer aujourd'hui.
Je suis agent multicartes : je tiens un catalogue des domaines que je représente et de leurs vins.
Champs d'un contact : nom, prénom, nom du restaurant, interlocuteur (patron ou sommelier), canal (en personne ou par téléphone), vins dégustés (cochés dans le catalogue), commentaire, date de la dernière visite.
Étapes : premier contact → dégustation → commande. Après une commande, le prospect devient client.
En cas d'erreur, je peux ramener un contact à l'étape précédente. Un client ramené en dégustation redevient prospect.
Relance : un contact sans visite depuis plus de 7 jours apparaît dans « À relancer », y compris les clients.

## Architecture

Une architecture en 3 couches : présentation, service, données.
Seule la couche données parle à la base.
Les règles métier ont des tests unitaires.

## Contraintes

Next.js, composants shadcn, déploiement sur Vercel.
Un seul utilisateur.
l'app n'est pas accessible publiquement, l'accès est restreint au niveau de l'hébergement.
Une base légère type SQLite, remplaçable sans toucher aux autres couches.
SQLite en local, Turso en production

## Hors périmètre

Pas d'authentification dans l'app, pas de gestion de droits, pas de multi-utilisateur.

## Critères d'acceptation

- J'ajoute un contact, il apparaît dans la liste.
- Après redémarrage de l'app, mes contacts sont toujours là.
- Changer de base ne modifie que la couche données.
- Je passe un contact à l'étape suivante, sa nouvelle étape s'affiche dans la liste et reste après un redémarrage.
- Je ramène un contact à l'étape précédente, sa nouvelle étape s'affiche dans la liste et reste après un redémarrage.
- Je modifie l'interlocuteur et le canal d'un contact, quelle que soit son étape.
- J'ajoute des domaines et leurs vins au catalogue.
- Je coche les vins dégustés d'un contact dans le catalogue, je les retrouve sur sa fiche et dans la liste.
- Un contact sans visite depuis plus de 7 jours apparaît dans la liste "À relancer" y compris les clients.
