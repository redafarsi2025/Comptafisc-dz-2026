/**
 * @fileOverview Service d'initialisation (Seeding) de l'architecture analytique.
 * Propose des structures par défaut selon le secteur d'activité du tenant.
 * Enrichi pour 2026 : Transport, Santé et Agroalimentaire.
 */

import { Firestore, collection, addDoc } from 'firebase/firestore';

interface DefaultStructure {
  axes: Array<{
    code: string;
    libelle: string;
    obligatoire: boolean;
    ordre: number;
    sections: Array<{ code: string; libelle: string }>;
  }>;
}

const STRUCTURES_PAR_DEFAUT: Record<string, DefaultStructure> = {
  BTP: {
    axes: [
      {
        code: 'PRJ',
        libelle: 'Chantiers / Projets',
        obligatoire: true,
        ordre: 1,
        sections: [
          { code: 'PRJ-001', libelle: 'Chantier Pilote A' },
          { code: 'PRJ-SIEGE', libelle: 'Travaux Siège' }
        ]
      },
      {
        code: 'CC',
        libelle: 'Centres de Coût (Structure)',
        obligatoire: false,
        ordre: 2,
        sections: [
          { code: 'ADM', libelle: 'Administration Générale' },
          { code: 'LOG', libelle: 'Logistique & Matériel' }
        ]
      }
    ]
  },
  TRANSPORT: {
    axes: [
      {
        code: 'VEH',
        libelle: 'Flotte de Véhicules',
        obligatoire: true,
        ordre: 1,
        sections: [
          { code: 'TRK-01', libelle: 'Camion Renault K440 - A' },
          { code: 'TRK-02', libelle: 'Camion Renault K440 - B' },
          { code: 'BUS-01', libelle: 'Bus Transport Personnel' }
        ]
      },
      {
        code: 'LIG',
        libelle: 'Lignes / Trajets',
        obligatoire: false,
        ordre: 2,
        sections: [
          { code: 'ALG-ORN', libelle: 'Ligne Alger - Oran' },
          { code: 'ALG-SET', libelle: 'Ligne Alger - Sétif' }
        ]
      }
    ]
  },
  SANTE: {
    axes: [
      {
        code: 'SRV',
        libelle: 'Services / Départements',
        obligatoire: true,
        ordre: 1,
        sections: [
          { code: 'URG', libelle: 'Urgences' },
          { code: 'RAD', libelle: 'Radiologie' },
          { code: 'LAB', libelle: 'Laboratoire' },
          { code: 'PHAR', libelle: 'Pharmacie Interne' }
        ]
      }
    ]
  },
  INDUSTRIE: {
    axes: [
      {
        code: 'LINE',
        libelle: 'Lignes de Production',
        obligatoire: true,
        ordre: 1,
        sections: [
          { code: 'L1', libelle: 'Atelier de Montage' },
          { code: 'L2', libelle: 'Atelier Conditionnement' }
        ]
      },
      {
        code: 'FAM',
        libelle: 'Familles de Produits',
        obligatoire: true,
        ordre: 2,
        sections: [
          { code: 'PF-STD', libelle: 'Produits Standards' },
          { code: 'PF-PREM', libelle: 'Gamme Premium' }
        ]
      }
    ]
  },
  COMMERCE: {
    axes: [
      {
        code: 'REG',
        libelle: 'Régions / Wilayas',
        obligatoire: false,
        ordre: 1,
        sections: [
          { code: 'REG-C', libelle: 'Région Centre' },
          { code: 'REG-O', libelle: 'Région Ouest' },
          { code: 'REG-E', libelle: 'Région Est' }
        ]
      },
      {
        code: 'CAT',
        libelle: 'Catégories Marchandises',
        obligatoire: true,
        ordre: 2,
        sections: [
          { code: 'CAT-A', libelle: 'Produits Alimentaires' },
          { code: 'CAT-B', libelle: 'Électroménager' }
        ]
      }
    ]
  },
  SERVICES: {
    axes: [
      {
        code: 'POLE',
        libelle: 'Pôles d\'expertise',
        obligatoire: true,
        ordre: 1,
        sections: [
          { code: 'CONS', libelle: 'Conseil & Audit' },
          { code: 'FORM', libelle: 'Formation' },
          { code: 'TECH', libelle: 'Assistance Technique' }
        ]
      }
    ]
  }
};

/**
 * Initialise l'architecture analytique par défaut pour un tenant.
 */
export async function seedDefaultAnalyticArchitecture(
  db: Firestore,
  tenantId: string,
  secteur: string
) {
  const structure = STRUCTURES_PAR_DEFAUT[secteur] || STRUCTURES_PAR_DEFAUT['SERVICES'];
  
  for (const axeDef of structure.axes) {
    // 1. Créer l'Axe
    const axeRef = await addDoc(collection(db, "tenants", tenantId, "axesAnalytiques"), {
      code: axeDef.code,
      libelle: axeDef.libelle,
      obligatoire: axeDef.obligatoire,
      ordre: axeDef.ordre,
      actif: true,
      secteurs: [secteur],
      createdAt: new Date().toISOString()
    });

    // 2. Créer les Sections rattachées
    for (const secDef of axeDef.sections) {
      await addDoc(collection(db, "tenants", tenantId, "sectionsAnalytiques"), {
        axeId: axeRef.id,
        axeCode: axeDef.code,
        axeLibelle: axeDef.libelle,
        code: secDef.code,
        libelle: secDef.libelle,
        actif: true,
        parentId: null,
        niveau: 1,
        createdAt: new Date().toISOString()
      });
    }
  }
}
