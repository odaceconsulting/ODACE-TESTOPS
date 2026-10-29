# ODACE TestOps - Plateforme d'Orchestration des Tests

Plateforme centralisée d'orchestration de tests (JMeter, Selenium, API) et de livraison pour **JS2E**, développée selon les spécifications d'**ODACE CONSULTING**.

---

## 1. Organisation du Monorepo

```
odace-testops/
├── apps/
│   ├── api/                    # API REST FastAPI (authentification, RBAC, contrôle des demandes)
│   ├── orchestrator/           # Moteur d'états, verrous cibles, watchdog et quality gates
│   ├── agent/                  # Démon d'exécution sécurisé Docker
│   ├── web/                    # Interface utilisateur React / Next.js
│   └── fake-target/            # Service HTTP factice pour tester les campagnes et pannes
│
├── connectors/
│   ├── sdk/                    # Contrat universel des connecteurs (Connector Protocol)
│   ├── echo/                   # Connecteur simple de validation de chaîne
│   ├── jmeter/                 # Pilote JMeter, lecture JTL, détection saturation
│   └── selenium/               # Pilote Selenium, rapports JUnit, détection instabilité
│
├── libs/
│   ├── domain/                 # États, énumérations, règles de transition et quality gates purs
│   ├── contracts/              # Schémas d'échanges Pydantic (runs, événements, verdicts)
│   └── persistence/            # Modèles SQLAlchemy (12 tables du socle) et moteur async
│
├── migrations/                 # Migrations versionnées de base de données (Alembic)
│
├── deploy/
│   ├── compose/                # docker-compose.dev.yml (Postgres, Redis, MinIO, Keycloak)
│   ├── docker/                 # Dockerfiles pour chaque composant
│   └── config/                 # Configurations (Prometheus, Keycloak realm)
│
├── tests/
│   ├── unit/                   # Tests unitaires des règles de gestion
│   ├── integration/            # Tests avec base PostgreSQL et Redis réels
│   ├── e2e/                    # Parcours complets de bout en bout
│   └── failures/               # Tests de chaos et de pannes (watchdog, coupure agent)
│
├── docs/                       # Architecture, décisions d'architecture (ADR) et exploitation
├── Makefile                    # Commandes standardisées de cycle de vie
├── pyproject.toml              # Dépendances Python et outillage
└── README.md
```

---

## 2. Principes Fondamentaux & Règles d'Or

1. **Les 3 dimensions du verdict** :
   - **État d'exécution** (`state`) : `QUEUED`, `DISPATCHED`, `RUNNING`, `FINISHED`, `FAILED`, `CANCELLED`, `INDETERMINATE`.
   - **Résultat technique** (`result`) : `CONFORME`, `NON_CONFORME`, `INFORMATIF`, `NON_FIABLE`.
   - **Validation humaine** (`validation`) : `EN_ATTENTE`, `VALIDE`, `REFUSE`.
2. **Gestion de l'incertitude** : En cas de perte de contact avec un agent ou de crash, le test passe en `INDETERMINATE`. **Aucune relance automatique de charge** n'est autorisée.
3. **Idempotence stricte** : Tout appel `POST /runs` porte un en-tête `Idempotency-Key` unique par projet.
4. **Réservation de cible** : Un seul test de charge à la fois par cible.
5. **Détection de saturation de l'injecteur** : Si le générateur sature (CPU > 80%, pause GC > 500ms, débit < 90%), le résultat est marqué `NON_FIABLE` pour ne pas accuser l'application cible à tort.

---

## 3. Démarrage Rapide

### Prérequis
* Python 3.12+
* Node.js 20+ & pnpm
* Docker & Docker Compose

### Commandes usuelles
```bash
# 1. Démarrer les services socle (Postgres, Redis, MinIO, Keycloak, Fake Target)
make up

# 2. Appliquer les migrations de base de données
make migrate

# 3. Lancer l'interface Web (Next.js)
make web-dev

# 4. Lancer les tests unitaires et d'intégration
make test

# 5. Contrôler le code (linter & typage strict)
make lint
```
