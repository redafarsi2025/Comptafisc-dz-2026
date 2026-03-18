"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUser, useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { User, Mail, Shield, LogOut, Loader2, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const router = useRouter()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut(auth)
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt sur ComptaFisc-DZ.",
      })
      router.push("/login")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter.",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary">Mon Profil</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles et votre compte expert-comptable.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="h-32 bg-primary/10 border-b" />
        <CardHeader className="relative pb-0">
          <div className="absolute -top-12 left-6">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200`} />
              <AvatarFallback className="text-2xl">DZ</AvatarFallback>
            </Avatar>
          </div>
          <div className="pl-32 flex justify-between items-start pt-2">
            <div>
              <CardTitle className="text-2xl">{user?.displayName || "Utilisateur"}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Shield className="h-3 w-3" /> Expert-Comptable Certifié
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Compte Actif
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-8 space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" defaultValue={user?.displayName || ""} readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" defaultValue={user?.email || ""} readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Identifiant unique (UID)</label>
              <Input className="bg-muted font-mono text-xs" defaultValue={user?.uid || ""} readOnly />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 flex justify-between p-6">
          <Button variant="outline" onClick={() => toast({ title: "Note", description: "Veuillez utiliser Firebase Console pour modifier l'email." })}>
            <Save className="mr-2 h-4 w-4" /> Mettre à jour
          </Button>
          <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Se déconnecter
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive text-lg">Zone de danger</CardTitle>
          <CardDescription>Actions irréversibles sur votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="link" className="text-destructive p-0 h-auto">Supprimer définitivement mon accès</Button>
        </CardContent>
      </Card>
    </div>
  )
}
