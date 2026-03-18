'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

/**
 * Component that listens for authentication errors and displays them as toasts.
 */
export function AuthErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthError = (error: Error) => {
      let message = "Une erreur est survenue lors de l'authentification.";
      
      // Map common Firebase Auth error codes to user-friendly messages in French
      if (error.message.includes('auth/invalid-credential')) {
        message = "Email ou mot de passe incorrect.";
      } else if (error.message.includes('auth/user-not-found')) {
        message = "Aucun compte n'existe avec cet email.";
      } else if (error.message.includes('auth/wrong-password')) {
        message = "Mot de passe incorrect.";
      } else if (error.message.includes('auth/email-already-in-use')) {
        message = "Cet email est déjà utilisé par un autre compte.";
      } else if (error.message.includes('auth/weak-password')) {
        message = "Le mot de passe doit contenir au moins 6 caractères.";
      }

      toast({
        variant: "destructive",
        title: "Erreur d'authentification",
        description: message,
      });
    };

    errorEmitter.on('auth-error', handleAuthError);

    return () => {
      errorEmitter.off('auth-error', handleAuthError);
    };
  }, [toast]);

  return null;
}
