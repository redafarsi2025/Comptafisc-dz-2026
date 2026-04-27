# Plan de Migration : Architecture Microservices Master Node

## 🏁 Vision Stratégique
L'objectif est de découpler les domaines critiques de l'ERP pour permettre une mise à l'échelle indépendante, une maintenance isolée et une résilience accrue face aux pics de charge (notamment lors des clôtures fiscales mensuelles du 20).

---

## 🏗️ Décomposition des Domaines (Services)

### 1. Identity & Access Service (IAS)
- **Rôle** : Authentification, gestion des rôles (RBAC), multi-tenancy.
- **Tech Stack** : Firebase Auth + Cloud Functions (Node.js/TS).
- **Isolation** : Propriétaire de la collection `/userProfiles` et `/saas_admins`.

### 2. Fiscal & DSL Engine Service (FES)
- **Rôle** : Moteur de calcul déterministe, gestion des règles législatives (LF 2026).
- **Tech Stack** : Cloud Run (Go ou Rust pour la performance des calculs massifs).
- **Communication** : gRPC pour les calculs temps réel, Pub/Sub pour les audits de masse.

### 3. Accounting & Ledger Service (ALS)
- **Rôle** : Grand Livre, écritures journal, balance, états financiers (SCF).
- **Tech Stack** : Cloud Run + Firestore (Instance dédiée).
- **Événements** : Émet `ENTRY_VALIDATED`, `FISCAL_YEAR_CLOSED`.

### 4. Payroll & HR Service (PHS)
- **Rôle** : Gestion des employés, calcul indiciaire, génération DAS/DAC.
- **Tech Stack** : Cloud Run + Cloud SQL (PostgreSQL pour les relations complexes de carrière).
- **Compliance** : Interroge le *Fiscal Engine Service* pour les barèmes IRG.

### 5. Logistics & Fleet Service (LFS)
- **Rôle** : Maintenance, carburant, télématique, suivi analytique par véhicule.
- **Tech Stack** : Cloud Run + Firebase RTDB (pour le tracking temps réel).

### 6. AI & Vision Service (AVS)
- **Rôle** : OCR Gemini, assistant fiscal RAG, analyse prédictive SEAD.
- **Tech Stack** : Genkit + Vertex AI + Cloud Storage.
- **Async** : Traitement par file d'attente (Cloud Tasks).

---

## 🔄 Communication Inter-Services

### Synchrone (Lecture/Calcul immédiat)
- **API Gateway (Google Cloud Endpoints)** : Point d'entrée unique pour le Frontend.
- **BFF (Backend-for-Frontend)** : Le Next.js actuel devient un orchestrateur qui agrège les appels aux microservices.

### Asynchrone (Consistance Éventuelle)
- **Google Cloud Pub/Sub** : 
    - Exemple : Quand une facture est émise (Sales Service), un message est publié. Le *Accounting Service* le consomme pour créer l'écriture et le *Logistics Service* pour mettre à jour la rentabilité véhicule.

---

## 🗺️ Feuille de Route de Migration (Phases)

### Phase 1 : Abstraction (Strangler Fig Pattern)
- Isoler la logique métier dans des modules `src/services` indépendants des composants UI.
- Introduire des interfaces (Repository Pattern) pour préparer le changement de source de données.

### Phase 2 : Extraction du Moteur Fiscal
- Déplacer `fiscal-engine.ts` vers une Cloud Function isolée.
- Le monolithe Next.js appelle cette fonction via HTTPS au lieu de l'exécuter localement.

### Phase 3 : Découplage de la Donnée
- Migration progressive des collections Firestore vers des instances de base de données dédiées par service pour supprimer les dépendances directes.

### Phase 4 : Orchestration & Observabilité
- Déploiement via **Terraform**.
- Monitoring centralisé avec **Google Cloud Logging** & **Trace** pour suivre une transaction à travers tous les services.

---
*Note : Ce document est une spécification d'architecture et ne contient pas de code exécutable.*
