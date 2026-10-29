# Guide de Déploiement Rapide - ODACE TestOps

Ce guide permet de déployer l'application gratuitement afin de permettre à votre Direction Générale et à vos équipes de tester la plateforme en ligne.

---

## 1. Déploiement du Frontend sur Vercel (Gratuit)

Vercel est optimisé nativement pour Next.js et offre un hébergement cloud gratuit et ultra-rapide.

### Étapes :
1. Rendez-vous sur [vercel.com](https://vercel.com) et connectez-vous avec votre compte GitHub.
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Importez le dépôt `odaceconsulting/ODACE-TESTOPS`.
4. Configurez le projet :
   - **Framework Preset** : Next.js
   - **Root Directory** : Cliquez sur **Edit** et sélectionnez le dossier `apps/web`.
   - **Build and Output Settings** : Laissez par défaut.
   - **Environment Variables** (optionnel au début, à renseigner dès que l'API est déployée) :
     - `API_URL` : L'URL HTTPS de votre backend (ex: `https://odace-testops-api.onrender.com`).
5. Cliquez sur **Deploy**.

> 💡 **Remarque importante** : Si l'API n'est pas encore déployée, le frontend Vercel affichera toute l'interface et la maquette interactive sans erreur. Dès que le backend sera déployé, renseignez simplement `API_URL` dans les variables d'environnement Vercel pour activer les appels réels vers la base PostgreSQL.

---

## 2. Déploiement du Backend sur Render (Gratuit)

Render propose un plan gratuit pour les services web Docker et les bases PostgreSQL.

### Option A : Déploiement automatique via Blueprint (1 clic)
1. Rendez-vous sur [render.com](https://render.com) et connectez-vous avec GitHub.
2. Cliquez sur **"New +"** > **"Blueprint"**.
3. Sélectionnez le dépôt `odaceconsulting/ODACE-TESTOPS`.
4. Render va détecter automatiquement le fichier [`render.yaml`](../render.yaml) qui configure :
   - Le service web API (`odace-testops-api`) basé sur `deploy/docker/Dockerfile.api`.
   - La base de données PostgreSQL managée (`odace-testops-db`).
5. Cliquez sur **Apply**.
   - Au premier démarrage, l'API initialise automatiquement les tables et insère les 7 profils de testeurs/administrateurs.

### Option B : Déploiement Web Service manuel
- **Type** : Web Service
- **Build & Runtime** : Docker
- **Dockerfile Path** : `deploy/docker/Dockerfile.api`
- **Context** : `.` (racine du monorepo)
- **Port** : `8000`
- **Environment Variables** :
  - `DATABASE_URL` : URL de connexion fournie par votre base de données PostgreSQL (Render ou [Neon.tech](https://neon.tech)).

---

## 3. Liaison Vercel ↔ Backend

Une fois l'URL Render obtenue (ex: `https://odace-testops-api.onrender.com`) :
1. Allez sur votre projet Vercel > **Settings** > **Environment Variables**.
2. Ajoutez :
   - `API_URL` = `https://odace-testops-api.onrender.com`
3. Allez dans l'onglet **Deployments** et cliquez sur **Redeploy** pour prendre en compte la variable.

---

## 4. Identifiants de Démonstration pour la Direction

| Rôle | Identifiant | Mot de passe par défaut |
| :--- | :--- | :--- |
| **Administrateur** | `marc.vasseur` | `odace2026!` |
| **Tech Lead** | `marie.laurent` | `odace2026!` |
| **Responsable Projets** | `eleonore.kasse` | `odace2026!` |
| **Testeur Performance** | `alexandre.dupont` | `odace2026!` |
| **Exploitation / SRE** | `lucas.moreau` | `odace2026!` |
| **Développeur** | `thomas.bernard` | `odace2026!` |
| **Auditeur Conformité** | `fatou.traore` | `odace2026!` |
