
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Loader2, Mail, Lock, User, KeyRound } from "lucide-react"
import { useAuth, useUser, useFirestore, initiateEmailSignUp, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const router = useRouter()
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

  const SUPER_KEY = process.env.NEXT_PUBLIC_SUPERADMIN_KEY;

  // Redirect if already logged in
  React.useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      // Si l'utilisateur a utilisé la clé admin, on le redirige vers l'admin
      if (formData.adminKey === SUPER_KEY && SUPER_KEY) {
        // Promotion immédiate si la clé est valide
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
        router.push("/dashboard");
      }
    }
  }, [user, isUserLoading, router, db, formData.adminKey, SUPER_KEY])

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
        title: "Compte en cours de création",
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
            Créez votre compte pour gérer votre fiscalité en Algérie.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "S'inscrire"}
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
