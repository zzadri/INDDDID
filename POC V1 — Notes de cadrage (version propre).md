## 1) Objectif du POC V1

Le **POC V1** a pour objectif de **démontrer la viabilité** :

- du **modéleur en 2D**
- de la **représentation visuelle des données**
- de l’architecture globale choisie
- et de la capacité à **ajouter une nouvelle source de données** via une **API publique**

➡️ L’idée est de valider rapidement une base fonctionnelle avant d’aller plus loin (3D, enrichissements, etc.).

---

## 2) Périmètre fonctionnel (V1)

### ✅ Inclus dans le POC V1

- Représentation **en 2D uniquement** (pas de 3D à ce stade)
- Intégration des données provenant du **modéleur**
- Définition du **format de données** attendu (JSON / YAML à confirmer)
- Affichage / rendu des données côté front
- Ajout d’une **nouvelle source de données externe** via une API publique
- Validation de la chaîne complète : **source → backend → base → frontend**

### ❌ Hors périmètre (pour l’instant)

- 3D
- Fonctionnalités avancées du modéleur
- Optimisations de performance poussées
- Gestion complexe des droits / auth (sauf besoin minimum)
- Industrialisation complète (CI/CD avancée, monitoring complet, etc.)

---
## 3) Source des données

## Origine principale des données

Les données doivent venir :

- **du modéleur** (source métier principale)
    

### Points à définir / clarifier

- **Format exact des données** exportées par le modéleur :
    
    - JSON ?
    - YAML ?
    - autre ?
        
- Structure des objets
- Champs obligatoires / optionnels
- Fréquence de mise à jour
- Mode d’intégration :
    - import de fichier
    - appel API
    - push / pull

---

## 4) Format de données attendu (à formaliser)

Le POC doit permettre de **stabiliser un contrat de données**.

### Format cible envisagé

- **JSON** ou **YAML** (à valider)
    

### À documenter impérativement

- Schéma des données (structure globale)
- Types de champs (string, number, boolean, array, etc.)
- Identifiants uniques
- Relations entre objets (si applicable)
- Champs nécessaires à l’affichage 2D
- Gestion des champs manquants / invalides

➡️ Idéalement : produire un **exemple de payload** + une **mini spec** (même simple).

---

## 5) Architecture technique envisagée (POC V1)

Backend : **Node.js**
Frontend : **Angular**
Base de données : **PostgreSQL**
### Rôle de chaque composant

- **Backend Node**
    - expose l’API
    - récupère/transforme les données du modéleur et de l’API publique
    - centralise la logique d’orchestration
    - échange avec PostgreSQL
        
- **Frontend Angular**
    - affiche la représentation 2D
    - consomme l’API backend
    - permet de visualiser les données du modéleur + source externe
        
- **PostgreSQL**
    - stocke les données normalisées (si persistance requise)
    - permet les tests de viabilité de modèle de données

---

## 6) Finalité métier / démonstration attendue

Le POC V1 doit permettre de montrer concrètement :

1. qu’on sait **ingérer les données du modéleur**
2. qu’on sait les **structurer / transformer**
3. qu’on sait les **représenter en 2D**
4. qu’on peut **brancher une nouvelle source de données** facilement (API publique)
5. que l’architecture choisie (**Node + Angular + PostgreSQL**) est viable

---

## 7) Critères de réussite (proposition)

Le POC V1 est considéré comme réussi si :

-  Un jeu de données du modéleur est récupéré et exploitable
-  Le format de données est défini (JSON/YAML + structure)
-  Le backend Node expose une API fonctionnelle
-  Le frontend Angular affiche une représentation 2D cohérente
-  Une API publique externe est intégrée comme seconde source
-  La démonstration montre clairement la possibilité d’ajouter d’autres sources

---

## 8) Livrables attendus (proposition)

### Livrables techniques

- Code du **backend Node**
- Code du **frontend Angular**
- Schéma / script de base **PostgreSQL**
- Exemple(s) de données (modéleur + API publique)

### Livrables de cadrage / doc

- Note de cadrage POC V1 (celle-ci)
- Format de données (mini spec JSON/YAML)
- Schéma d’architecture simple
- Liste des limites / points à traiter en V2

---

## 9) Points de vigilance

- Bien **figer le format de données** dès le début (sinon tout bouge)
- Ne pas partir trop tôt sur de la 3D
- Garder un périmètre **POC** (preuve de faisabilité, pas produit final)
- Prévoir un mapping propre entre :
    - données modéleur
    - données API publique
    - modèle interne backend / BDD