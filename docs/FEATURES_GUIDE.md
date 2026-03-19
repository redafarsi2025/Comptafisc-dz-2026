# ComptaFisc-DZ : Guide des Fonctionnalités & Installation

## 🌟 Présentation
ComptaFisc-DZ est une plateforme SaaS de pointe dédiée à la gestion comptable et fiscale en Algérie. Elle intègre l'intelligence artificielle (Gemini 2.5) pour automatiser la conformité réglementaire (LF 2026) et le traitement des documents officiels.

---

## 🚀 Fonctionnalités Clés

### 1. Comptabilité SCF & Patrimoine
- **Saisie Journal Assistée** : Modèles d'écritures intelligents et auto-ventilation de la TVA (19%).
- **États Financiers Dynamiques** : Grand Livre, Balance à 6 colonnes, Bilan (Actif/Passif) et TCR générés en temps réel.
- **Registre des Immobilisations** : Calcul automatique des dotations aux amortissements au prorata temporis.
- **Rapprochement Bancaire** : Matching IA entre relevés bancaires et écritures comptables.

### 2. Ressources Humaines & Paie (LF 2026)
- **Moteur de Paie** : Calcul conforme au **SNMG 24 000 DA** et au nouveau barème IRG avec lissage.
- **Gestion Spécifique** : Prise en charge des zones Sud (IZCV), travailleurs handicapés et retraités.
- **Déclarations Sociales** : Génération des bordereaux **DAC (CNAS)** et fichiers XML pour la **DAS Annuelle**.
- **Secteur BTP** : Gestion complète des cotisations **CACOBATPH** (CP & CI).

### 3. Fiscalité DGI & Déclarations
- **Série G** : Pré-remplissage des formulaires **G50** (Mensuel), **G50 ter** (Trimestriel), **G12/G12 bis** (IFU) et **G4** (Liasse annuelle).
- **Déclaration d'Existence (G8)** : Suivi des délais légaux de 30 jours avec alertes.
- **Calculateur CASNOS** : Estimation des cotisations non-salariés basée sur l'assiette annuelle.

### 4. Studio de Formulaires IA (Innovation)
- **Ingestion PDF/Image** : Upload direct de scans officiels.
- **Mapping Vision IA** : Détection automatique des zones de saisie et affectation des variables système (`TENANT_NIF`, `TOTAL_TVA`, etc.) par l'IA.
- **Stockage Firestore** : Sauvegarde intégrale du fond (Base64) et de la structure dans le Cloud.

### 5. Console d'Administration SaaS
- **DGI Watch** : Scrapping automatisé du site de la DGI pour une veille réglementaire en temps réel.
- **Moteur Fiscal Master** : Mise à jour centralisée des taux et seuils sans modification de code.
- **Support & Tickets** : Système de chat en temps réel entre les abonnés et l'équipe technique.

---

## 🛠 Guide d'Installation (Environnement Antigravity/Dev)

### Pré-requis
- **Node.js** v20+
- **Projet Firebase** (Firestore & Auth activés)
- **Clé API Google AI** (pour Gemini/Genkit)

### Étapes d'installation

1. **Configuration des variables d'environnement** :
   Créez un fichier `.env` à la racine :
   ```env
   GOOGLE_GENAI_API_KEY=votre_cle_gemini
   NEXT_PUBLIC_SUPERADMIN_KEY=votre_cle_secrete_admin
   ```

2. **Installation des dépendances** :
   ```bash
   npm install
   ```

3. **Lancement du mode développement** :
   ```bash
   npm run dev
   ```

4. **Lancement de l'interface Genkit (IA)** :
   ```bash
   npm run genkit:dev
   ```

### Déploiement Cloud
L'application est configurée pour **Firebase App Hosting**. 
- Le fichier `apphosting.yaml` gère la mise à l'échelle.
- Les règles de sécurité sont définies dans `firestore.rules` pour garantir l'isolement des données entre dossiers clients (Multi-tenancy).

---
*Document généré par l'App Prototyper - ComptaFisc-DZ v2.0*
