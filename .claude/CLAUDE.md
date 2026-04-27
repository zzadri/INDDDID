# CLAUDE.md — INDDID POC V1

> Référence unique pour les agents IA, les développeurs et les reviewers.
> Mise à jour à chaque changement d'architecture ou de politique.

---

## 1. Contexte projet

**INDDID** est un outil de cartographie dynamique des Systèmes d'Information (SI), développé comme POC (Proof of Concept) dans le cadre d'un projet de fin de Master.

### Objectif fonctionnel
- Permettre à un utilisateur authentifié de créer, gérer et visualiser des **schémas topologiques** de son SI
- Composants modélisables : serveurs, bases de données, firewalls, routeurs, switchs, APIs, etc.
- Interface visuelle de type **Visio** : drag & drop depuis une palette, connexions entre nœuds, propriétés riches

### Périmètre POC V1
- Auth JWT + bcrypt (register / login)
- Dashboard projets multi-utilisateurs
- Modéleur Cytoscape.js (2D, interactif)
- Templates de nœuds réutilisables (globaux + utilisateur)
- Stack dockerisée complète

### Hors périmètre V1 (V2+)
- Partage / permissions entre utilisateurs
- Versioning des schémas (git-like)
- Collaboration temps réel (WebSockets)

---

## 2. Stack technique

| Couche | Techno | Version |
|--------|--------|---------|
| Frontend | Angular | 17.x (standalone, esbuild) |
| Canvas | Cytoscape.js | 3.29+ |
| Backend | Node.js + Express | 20 LTS |
| Langage | TypeScript | 5.4 |
| Base de données | PostgreSQL | 16-alpine |
| ORM | Prisma | 5.x |
| Auth | JWT (jsonwebtoken) + bcrypt (bcryptjs) | — |
| Validation | Zod | 3.x |
| Sécurité HTTP | Helmet + express-rate-limit | — |
| Icônes | Lucide SVG (MIT) | embarquées |
| Conteneurisation | Docker + docker-compose | — |
| Reverse proxy | nginx | 1.25-alpine |

---

## 3. Architecture

### 3.1 Backend — Clean Architecture

```
backend/src/
├── config/
│   ├── database.ts          # PrismaClient + waitForDb()
│   └── env.ts               # Variables d'environnement validées + typées
│
├── domain/
│   ├── entities.ts          # Types purs : User, Project, Node, Edge, Template, JwtPayload
│   └── errors.ts            # AppError, NotFoundError, AuthError, ValidationError, ConflictError
│
├── infrastructure/
│   └── security/
│       ├── jwt.ts           # signToken() / verifyToken()
│       └── hash.ts          # hashPassword() / comparePassword()
│
├── application/             # Logique métier (use-cases / services)
│   ├── auth.service.ts
│   ├── project.service.ts
│   ├── node.service.ts
│   ├── edge.service.ts
│   ├── template.service.ts
│   └── prisma-mappers.ts
│
├── presentation/
│   ├── middleware/
│   │   ├── auth.middleware.ts    # requireAuth (injecte req.user)
│   │   ├── security.ts          # helmet + rate-limiters
│   │   ├── validate.ts          # Factory Zod middleware
│   │   └── error-handler.ts     # Gestionnaire d'erreurs centralisé
│   ├── validators/              # Schémas Zod par domaine
│   │   ├── auth.validator.ts
│   │   ├── project.validator.ts
│   │   ├── node.validator.ts
│   │   ├── edge.validator.ts
│   │   └── template.validator.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── project.routes.ts
│       ├── node.routes.ts
│       ├── edge.routes.ts
│       ├── template.routes.ts
│       └── icons.routes.ts
│
├── app.ts                   # Express app (middleware + routes, pas de bootstrap)
└── index.ts                 # Point d'entrée : waitForDb() + listen()
```

**Règles :**
- `domain/` ne dépend de rien d'autre dans le projet
- `infrastructure/` dépend uniquement de `domain/` et de libs externes
- `application/` dépend de `domain/` et `infrastructure/`
- `presentation/` dépend de tout le reste, jamais l'inverse

### 3.2 Frontend — Clean Architecture

```
frontend/src/app/
├── core/                    # Singletons (guards, interceptors, services globaux)
│   ├── guards/auth.guard.ts
│   ├── interceptors/auth.interceptor.ts
│   └── services/
│       ├── auth.service.ts
│       ├── theme.service.ts
│       └── api.service.ts
│
├── domain/
│   └── models.ts            # Interfaces TypeScript (Project, SiNode, SiEdge, etc.)
│
├── features/                # Un dossier par feature (lazy-loaded)
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.scss        # Styles BEM partagés auth
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   │   ├── dashboard.component.ts
│   │   ├── dashboard.component.html
│   │   └── dashboard.component.scss
│   └── modeler/
│       ├── modeler.component.ts
│       ├── modeler.component.html
│       └── modeler.component.scss
│
└── shared/                  # Utilitaires réutilisables
    ├── icons.ts             # Registre Lucide SVG
    └── node-schemas.ts      # Schémas de propriétés par type de nœud
```

### 3.3 Base de données

Tables PostgreSQL :
- `users` — id (UUID), email (unique), password_hash, display_name
- `projects` — id (UUID), name, description, version, owner_id (UUID) → users
- `project_permissions` — project_id (UUID), user_id (UUID), permission (V2)
- `nodes` — id (UUID), label, type (enum), project_id (UUID), properties (JSONB), position_x/y
- `edges` — id (UUID), source_node_id (UUID), target_node_id (UUID), type, label, properties, project_id (UUID)
- `node_templates` — id (UUID), name, type, properties (JSONB), is_global, created_by (UUID)

---

## 4. Conventions de code

### 4.1 TypeScript

- `strict: true` toujours activé (backend + frontend)
- Préférer `interface` à `type` pour les objets publics
- Pas de `any` → utiliser `unknown` puis affiner
- Erreurs : toujours étendre `AppError`, jamais lancer des strings
- Services : fonctions exportées, pas de classes (backend)
- Composants Angular : standalone, pas de NgModule

### 4.2 SCSS — Méthodologie BEM

```
Block__Element--Modifier
```

**Règles :**
- Un fichier SCSS par composant
- Variables globales dans `styles.scss` (CSS custom properties)
- Pas de styles inline dans les templates HTML (sauf cas exceptionnel justifié)
- Pas de `!important`
- Nesting SCSS autorisé pour `&--modifier` et `&:hover` uniquement

**Exemples :**
```scss
// Bon
.project-card { }
.project-card__header { }
.project-card__name { }
.project-card--featured { }

// Mauvais
.projectCard { }
.project-card .header { }
#project-name { }
```

**Utilitaires globaux (hors BEM, dans styles.scss) :**
- `.text-muted`, `.text-faint`, `.text-accent` — couleurs de texte
- `.truncate` — overflow ellipsis
- `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-icon` — variantes de bouton
- `.badge`, `.badge--{type}` — badges colorés par type de nœud
- `.form-group` — groupe label + input

### 4.3 API REST

| Méthode | URL | Description |
|---------|-----|-------------|
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion → JWT |
| GET  | /api/auth/me | Profil courant |
| GET  | /api/projects | Projets de l'utilisateur |
| POST | /api/projects | Créer un projet |
| GET  | /api/projects/:id | Détail projet |
| GET  | /api/projects/:id/graph | Nœuds + liens |
| PUT  | /api/projects/:id | Mettre à jour |
| DELETE | /api/projects/:id | Supprimer |
| POST | /api/projects/:id/nodes | Créer nœud |
| PUT  | /api/projects/:id/nodes/:nid | Modifier nœud |
| DELETE | /api/projects/:id/nodes/:nid | Supprimer nœud |
| POST | /api/projects/:id/edges | Créer lien |
| DELETE | /api/projects/:id/edges/:eid | Supprimer lien |
| GET  | /api/templates | Templates accessibles |
| POST | /api/templates | Créer template |
| DELETE | /api/templates/:id | Supprimer template |
| GET  | /api/icons | Registre icônes |

**Format d'erreur standard :**
```json
{ "error": "Message lisible", "details": { ... } }
```

---

## 5. Sécurité

### 5.1 Politique backend

| Mesure | Implémentation | Config |
|--------|----------------|--------|
| Headers HTTP | Helmet | CSP, HSTS, X-Frame-Options, etc. |
| Rate limiting global | express-rate-limit | 200 req / 15 min |
| Rate limiting auth | express-rate-limit | 20 req / 15 min (login + register) |
| Validation entrées | Zod schemas | Toutes les routes POST/PUT |
| Auth | JWT Bearer token | Expiry 7j, HS256 |
| Mots de passe | bcrypt | cost factor 12 |
| CORS | Strict origin | Configurable via env CORS_ORIGIN |
| SQL injection | pg parameterized queries | Toujours `$1, $2...`, jamais concaténation |

### 5.2 Politique frontend

| Mesure | Implémentation |
|--------|----------------|
| XSS | Angular sanitize par défaut (DomSanitizer) |
| Headers sécurité | nginx : X-Frame-Options, X-Content-Type-Options, CSP |
| Auth header | JWT dans Authorization header (pas cookie → pas de CSRF) |
| Tokens | localStorage (compromis UX/sécurité accepté pour POC) |
| Route protection | CanActivateFn authGuard sur toutes les routes privées |

### 5.3 Variables d'environnement obligatoires en production

```env
JWT_SECRET=<random 64 chars minimum>
DB_PASSWORD=<strong password>
CORS_ORIGIN=https://votre-domaine.com
```

**Ne jamais committer `.env` en production. Utiliser `.env.example` comme template.**

---

## 6. Workflow de développement

### 6.1 Lancer le projet

```bash
# Copier les variables
cp .env.example .env

# Premier lancement (build + init DB)
docker-compose up --build

# Relancemements suivants
docker-compose up

# Rebuild uniquement le backend
docker-compose build backend && docker-compose up -d backend

# Rebuild uniquement le frontend
docker-compose build frontend && docker-compose up -d frontend

# Reset complet (supprimer les données)
docker-compose down -v && docker-compose up --build
```

**URLs :**
- Frontend : http://localhost:4200
- Backend direct : http://localhost:3000
- Compte démo : `demo@inddid.local` / `demo1234`

### 6.2 Ajouter un type de nœud

1. `frontend/src/app/shared/icons.ts` — ajouter dans `NODE_ICONS[]`
2. `frontend/src/app/shared/node-schemas.ts` — ajouter dans `NODE_SCHEMAS`
3. `frontend/src/app/domain/models.ts` — ajouter dans `NodeType` union
4. `backend/src/domain/entities.ts` — ajouter dans `NodeType`
5. `backend/src/presentation/validators/node.validator.ts` — ajouter dans `NODE_TYPES`
6. `database/seed.sql` — ajouter exemples si pertinent

### 6.3 Ajouter une route API

1. Créer le validator Zod dans `backend/src/presentation/validators/`
2. Ajouter la logique dans `backend/src/application/`
3. Créer / modifier la route dans `backend/src/presentation/routes/`
4. Enregistrer la route dans `backend/src/app.ts`
5. Ajouter la méthode dans `frontend/src/app/core/services/api.service.ts`

### 6.4 Standards de commit

```
feat(modeler): ajouter export PNG
fix(auth): corriger token expiry sur logout
refactor(backend): migrer vers clean architecture
chore(deps): mettre à jour Angular 17.3
```

---

## 7. Fichiers clés à ne pas modifier sans revue

| Fichier | Raison |
|---------|--------|
| `database/init.sql` | Schéma DB — migration manuelle si changement |
| `backend/src/domain/entities.ts` | Types partagés — casse l'API si modifié |
| `backend/src/infrastructure/security/jwt.ts` | Sécurité auth |
| `frontend/src/app/core/interceptors/auth.interceptor.ts` | Token injecté sur toutes les requêtes |
| `docker-compose.yml` | Ports, dépendances services |

---

## 8. Checklist avant merge

- [ ] `docker-compose build` passe sans erreur
- [ ] Login démo fonctionne
- [ ] Drag & drop palette → canvas crée un nœud
- [ ] Sauvegarde propriétés persiste en DB
- [ ] Pas de `console.error` en prod sans handler
- [ ] Pas de secret en dur dans le code
- [ ] Pas de `any` TypeScript non justifié
- [ ] BEM respecté pour tout nouveau SCSS

---

## 9. Dette technique connue

| ID | Description | Priorité |
|----|-------------|----------|
| DT-01 | ~~Tokens stockés en localStorage~~ → **Résolu** : HttpOnly cookie `auth_token` (SameSite=Strict). Refresh token hors périmètre V1. | ✅ |
| DT-02 | Pas de pagination sur les listes nodes/edges | V2 |
| DT-03 | Theme toggle ne met pas à jour Cytoscape styles en temps réel | V2 |
| DT-04 | Pas de test unitaire ni e2e | V2 |
| DT-05 | `axios` importé dans backend mais non utilisé | À supprimer |

---

## 10. Agents IA specialises

Trois agents sont disponibles dans `.claude/agents/` :

- **code-reviewer** : review PR, analyse risques, détection bugs — `.claude/agents/code-reviewer.md`
- **snyk-security-agent** : audit dépendances CVE, plan de remédiation — `.claude/agents/snyk-security-agent.md`
- **sonarlint-guardian** : triage et correction issues SonarLint — `.claude/agents/sonarlint-guardian.md`

### Usage recommande

- Review PR : demander explicitement **code-reviewer** avec scope (fichiers, dossier, feature).
- Audit sécurité dépendances : **snyk-security-agent** avec contexte (dev/preprod/prod).
- Qualité code : **sonarlint-guardian** avec liste des findings ou fichiers modifiés.

### Bonnes pratiques d'utilisation

- Toujours donner un scope clair (fichiers, dossier, PR, commit).
- Toujours demander un resultat ordonne par severite.
- Exiger un plan d'action concret (quick wins 24h, puis backlog).
