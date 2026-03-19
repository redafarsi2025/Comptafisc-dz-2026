"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Loader2, Mail, Lock, User, KeyRound, Sparkles } from "lucide-react"
import { useAuth, useUser, useFirestore, initiateEmailSignUp, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    password: "",
    adminKey: "",
  })

  const isDemoMode = searchParams.get('demo') === 'true';
  const SUPER_KEY = process.env.NEXT_PUBLIC_SUPERADMIN_KEY;

  // Redirect if already logged in
  React.useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      if (formData.adminKey === SUPER_KEY && SUPER_KEY) {
        const adminRef = doc(db, "saas_admins", user.uid);
        setDocumentNonBlocking(adminRef, {
          id: user.uid,
          email: user.email,
          promotedAt: new Date().toISOString(),
          isSuperAdmin: true,
          method: "Auto-Promotion via Key"
        }, { merge: true });
        router.push("/saas-admin");
      } else {
        // Pass demo flag forward if present
        const targetUrl = isDemoMode ? "/dashboard?demo=true" : "/dashboard";
        router.push(targetUrl);
      }
    }
  }, [user, isUserLoading, router, db, formData.adminKey, SUPER_KEY, isDemoMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password || !formData.name) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires.",
      })
      return
    }

    setIsLoading(true)
    try {
      initiateEmailSignUp(auth, formData.email, formData.password)
      toast({
        title: isDemoMode ? "Préparation de votre démo..." : "Compte en cours de création",
        description: "Veuillez patienter pendant la redirection...",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Impossible de créer le compte.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="bg-primary p-2 rounded-xl mb-2">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">ComptaFisc-DZ</CardTitle>
          <CardDescription>
            {isDemoMode 
              ? "Inscrivez-vous pour accéder à votre espace de démo personnalisé." 
              : "Créez votre compte pour gérer votre fiscalité en Algérie."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isDemoMode && (
              <div className="bg-accent/10 border border-accent/20 p-3 rounded-lg flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                <p className="text-[10px] text-accent-foreground font-bold uppercase leading-tight">
                  Le dossier "Bensalem Commerce" sera prêt dès votre première connexion.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="email"
                  placeholder="nom@entreprise.dz"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            {!isDemoMode && (
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <KeyRound className="h-3 w-3" /> Clé d'administration (Optionnel)
                  </label>
                  <Input
                    className="bg-muted/30 border-dashed"
                    type="password"
                    placeholder="Clé secrète superadmin"
                    value={formData.adminKey}
                    onChange={(e) => setFormData({ ...formData, adminKey: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full h-12 text-lg" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isDemoMode ? "Lancer ma Démo" : "S'inscrire")}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Se connecter
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
