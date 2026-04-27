---
name: angular-ssr
description: "Note: INDDID n'utilise pas Angular SSR. Ce skill couvre les tâches Cytoscape.js / canvas modeler."
argument-hint: "Décrire la feature canvas ou le bug Cytoscape à corriger"
user-invocable: true
---

# Cytoscape.js Modeler Workflow

> INDDID n'utilise pas Angular SSR (Universal). Ce skill couvre les tâches du composant modeler Cytoscape.js.

## Use This Skill When

- Ajout de nouveaux types de nœuds ou arêtes dans le canvas.
- Correction de bugs de rendu Cytoscape (layout, styles, sélection).
- Implémentation de features canvas (export, undo, snap, zoom).
- Optimisation des performances du modeler.

## Core Constraints

- L'instance `cy` ne doit pas sortir de `modeler.component.ts`.
- Les événements Cytoscape (tap, drag) doivent s'exécuter hors zone Angular (`NgZone.runOutsideAngular`).
- Les positions x/y sont sauvegardées en DB après chaque déplacement de nœud (debounce recommandé).
- Les styles Cytoscape dépendent du thème actif — écouter `ThemeService` pour les mises à jour.

## Step-by-Step Process

1. Identifier le type de changement (nœud, arête, layout, style, interaction).
2. Vérifier `node-schemas.ts` et `icons.ts` pour les types existants.
3. Si nouveau type : suivre la checklist section 6.2 du CLAUDE.md (6 fichiers à modifier).
4. Implémenter dans `modeler.component.ts` avec gestion NgZone.
5. Tester : drag & drop depuis palette, sauvegarde propriétés, persistance en DB.
6. Vérifier pas de fuite mémoire sur destroy (`cy.destroy()` dans `ngOnDestroy`).

## Checklist Ajouter un Type de Nœud

1. `frontend/src/app/shared/icons.ts` — `NODE_ICONS[]`
2. `frontend/src/app/shared/node-schemas.ts` — `NODE_SCHEMAS`
3. `frontend/src/app/domain/models.ts` — `NodeType` union
4. `backend/src/domain/entities.ts` — `NodeType`
5. `backend/src/presentation/validators/node.validator.ts` — `NODE_TYPES`
6. `database/seed.sql` — exemples si pertinent

## Validation Checklist

- Drag & drop palette → canvas crée le nœud.
- Propriétés s'affichent dans le panneau latéral.
- Sauvegarde persiste en DB (vérifier via API `/api/projects/:id/graph`).
- Styles cohérents en thème clair et sombre.
- Pas de `console.error` dans la console navigateur.
