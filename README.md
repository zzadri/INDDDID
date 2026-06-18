# INDDDID

Ce projet est une application principalement en **TypeScript** avec une interface web (HTML/SCSS), une base de données PostgreSQL (PLpgSQL) et un environnement conteneurisé (Docker).

## Prérequis

Assurez-vous d’avoir installé :

- [Node.js](https://nodejs.org/) (version LTS recommandée)
- npm (fourni avec Node.js)
- [Docker](https://www.docker.com/) et Docker Compose
- [PostgreSQL](https://www.postgresql.org/) (si vous n’utilisez pas Docker pour la base)

## Installation

1. **Cloner le dépôt**

```bash
git clone https://github.com/zzadri/INDDDID.git
cd INDDDID
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer les variables d’environnement**

Créez un fichier `.env` à la racine du projet (ou copiez un fichier d’exemple s’il existe) :

```bash
cp .env.example .env
```

Puis adaptez les valeurs (base de données, ports, clés, etc.).

4. **Lancer les services (option Docker)**

```bash
docker compose up -d
```

5. **Appliquer la base de données**

Selon le projet, exécutez les migrations/scripts SQL nécessaires.

6. **Démarrer l’application**

```bash
npm run dev
```

## Scripts utiles

Quelques commandes courantes (à adapter selon les scripts disponibles dans `package.json`) :

- `npm run dev` : lance l’application en mode développement
- `npm run build` : compile le projet
- `npm run start` : lance l’application compilée
- `npm run test` : exécute les tests

## Structure technique (aperçu)

- **TypeScript** : logique applicative
- **HTML / SCSS** : interface utilisateur
- **PLpgSQL** : scripts/procédures base de données
- **Dockerfile / Docker Compose** : environnement d’exécution

## Dépannage rapide

- Vérifier que le fichier `.env` est correctement rempli.
- Vérifier que PostgreSQL est joignable et que les identifiants sont corrects.
- Si Docker est utilisé, vérifier l’état des conteneurs :

```bash
docker compose ps
```

## Contribution

1. Créez une branche : `git checkout -b feature/ma-feature`
2. Commitez vos changements : `git commit -m "Ajout de ..."`
3. Poussez la branche : `git push origin feature/ma-feature`
4. Ouvrez une Pull Request.
