# Plan de Migration : Transition vers Supabase (PostgreSQL)

## 🏁 Vision Stratégique
Migration de l'infrastructure NoSQL (Firebase) vers une architecture relationnelle SQL (Supabase). Ce changement vise à renforcer l'intégrité référentielle des données comptables et à exploiter la puissance des jointures SQL pour les rapports financiers complexes.

---

## 🏗️ Modélisation Relationnelle (Mapping)

### 1. Structure des Tables (Normalisation)
Contrairement à Firestore, les données seront normalisées pour éviter la redondance :
- **Table `tenants`** : Stockage des dossiers clients.
- **Table `journal_entries` & `journal_lines`** : Séparation des en-têtes et des lignes d'écritures (relation 1:N).
- **Table `employees`** : Données RH liées à un `tenant_id`.
- **Table `products`** : Catalogue articles avec contraintes de clés étrangères sur les comptes comptables.

### 2. Sécurité : Row Level Security (RLS)
Remplacement des *Firestore Rules* par des politiques **Postgres RLS** :
```sql
-- Exemple de politique de sécurité
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their tenant data" 
ON journal_entries 
FOR ALL 
USING (tenant_id IN (
  SELECT tenant_id FROM members WHERE user_id = auth.uid()
));
```

---

## 🔄 Stratégie de Transition

### Phase 1 : Schéma & Types
- Définition du schéma SQL dans Supabase.
- Génération des types TypeScript via la CLI Supabase pour garantir une "Type Safety" totale.

### Phase 2 : Migration des Données (ETL)
- Export des collections JSON depuis Firestore.
- Script de transformation pour aplatir les objets et injecter les relations (IDs).
- Import massif via `COPY` ou API REST de Supabase.

### Phase 3 : Logique Métier (Edge Functions)
- Migration des *Server Actions* Next.js ou des *Cloud Functions* vers des **Supabase Edge Functions** (Deno) pour les calculs fiscaux lourds.

---

## 🛠️ Avantages pour ComptaFisc-DZ
1. **Intégrité Totale** : Impossible d'avoir une ligne d'écriture orpheline (Clés étrangères).
2. **Requêtes Complexes** : Génération de la Balance et du Bilan en une seule requête SQL performante (CTE).
3. **Audit Trail** : Utilisation des triggers natifs PostgreSQL pour l'historique des modifications.

---
*Note : Ce document est une spécification d'ingénierie. L'exécution nécessite une reconfiguration du client Firebase vers le client Supabase.*
