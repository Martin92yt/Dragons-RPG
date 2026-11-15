# Modifier un message, un emoji ou un écran

Tout ce qui s'affiche est séparé en quatre couches. Chacune se modifie sans toucher aux autres.

| Je veux changer…                         | Où                                   |
| ---------------------------------------- | ------------------------------------ |
| un texte (FR et EN)                      | `src/i18n/messages/<domaine>.ts`     |
| un emoji (une icône pour un rôle)        | `src/core/icons.ts`                  |
| la structure d'un écran (lignes, ordre)  | `src/views/*.ts`                     |
| une image générée (carte, barre de vie)  | `src/canvas/*.ts`                    |
| la logique d'une commande                | `src/commands/*.ts`                  |

## Textes

Chaque domaine déclare ses textes une seule fois avec `defineMessages({ fr: {...}, "en-US": {...} })`.
TypeScript refuse de compiler si une clé existe dans une langue et pas dans l'autre.
Variables : `{nom}`. Mention de commande cliquable : `{/travel go}` (nom de base anglais, sous-commande
facultative) ; elle devient `</travel go:ID>` une fois les commandes déployées.
Les textes longs s'écrivent avec des `\n` ; `wrap()` (`src/core/text.ts`) rattrape les lignes de plus de ~72 caractères.

## Emojis

Le registre (`src/core/emojis.registry.ts`) liste les emojis du serveur. On ne les utilise jamais par leur
identifiant dans le code : `icons.ts` donne un nom de rôle (`health`, `gold`, `jobs`...) à chaque emoji,
`JOB_ICONS`, `CATEGORY_ICONS` et `LOCATION_ICONS` donnent une icône par métier, catégorie et type de lieu,
`PROGRESS_STEPS` définit les paliers des barres de progression.
Changer une icône = modifier une ligne de `icons.ts`. Un nom qui n'existe pas dans le registre ne compile pas.

## Écrans

`src/views/profile.ts` et `src/views/shop.ts` construisent leur écran ligne par ligne : déplacer, retirer ou
ajouter une ligne se fait à un seul endroit. Les commandes ne gèrent que la logique (joueur, erreurs, boutons).

## Images (canvas)

`src/canvas/` dessine en noir et blanc strict (palette dans `theme.ts`). Ressources facultatives dans `images/` :

- `images/enemies/<type d'ennemi>.png` : portrait affiché sur la fiche de bestiaire (sinon, une initiale) ;
- `images/font.ttf` : police des cartes (sinon, la police système).

## Logs

`src/core/logger.ts` expose `log.<domaine>` (consola). `LOG_LEVEL=4` pour le détail.
