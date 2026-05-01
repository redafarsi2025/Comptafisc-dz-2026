
// src/firebase/admin.ts
import * as admin from 'firebase-admin';

/**
 * Initialise l'application Firebase Admin côté serveur.
 * Gère l'initialisation pour s'assurer qu'elle ne se produit qu'une seule fois.
 */
export const initAdminApp = () => {
  // Si l'application est déjà initialisée, ne rien faire.
  if (admin.apps.length > 0) {
    return;
  }

  // Récupérer les informations du compte de service depuis les variables d'environnement.
  // Assurez-vous que la variable FIREBASE_SERVICE_ACCOUNT_KEY est définie dans votre environnement serveur.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  if (serviceAccount) {
    // Initialiser avec le compte de service si disponible
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    // Sinon, initialiser avec les informations d'identification par défaut.
    // Cela fonctionne dans les environnements Google Cloud (Cloud Run, Functions)
    // où les informations d'identification sont fournies automatiquement.
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
};
