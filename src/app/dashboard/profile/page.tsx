
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUser, useAuth, useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"
import { User, Mail, Shield, LogOut, Loader2, Save, KeyRound, ShieldCheck, ArrowRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ProfilePage() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [adminKey, setAdminKey] = React.useState("")
  const [isPromoting, setIsPromoting] = React.useState(false)

  // Vérifier si l'utilisateur est déjà admin
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

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

  const handleBecomeAdmin = async () => {
    if (adminKey !== "ADMIN2026") {
      toast({
        variant: "destructive",
        title: "Clé invalide",
        description: "La clé de sécurité SuperAdmin est incorrecte.",
      })
      return
    }

    if (!db || !user) return
    setIsPromoting(true)

    try {
      await setDocumentNonBlocking(doc(db, "saas_admins", user.uid), {
        id: user.uid,
        email: user.email,
        promotedAt: new Date().toISOString(),
        role: "SUPER_ADMIN"
      }, { merge: true })

      toast({
        title: "Accès Admin Activé",
        description: "Vous êtes maintenant Super Administrateur de la plateforme.",
      })
      setAdminKey("")
    } catch (e) {
      console.error(e)
    } finally {
      setIsPromoting(false)
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
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary">Mon Profil</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles et votre compte expert-comptable.</p>
      </div>

      <Card className="overflow-hidden shadow-lg border-none ring-1 ring-border">
        <div className="h-32 bg-gradient-to-r from-primary to-blue-600 border-b" />
        <CardHeader className="relative pb-0">
          <div className="absolute -top-12 left-6">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
              <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200`} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-white">DZ</AvatarFallback>
            </Avatar>
          </div>
          <div className="pl-32 flex justify-between items-start pt-2">
            <div>
              <CardTitle className="text-2xl font-black text-slate-900">{user?.displayName || user?.email?.split('@')[0] || "Utilisateur"}</CardTitle>
              <CardDescription className="flex items-center gap-1 font-medium">
                {isSaaSAdmin ? (
                  <span className="text-primary flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Super Administrateur SaaS</span>
                ) : (
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Expert-Comptable Certifié</span>
                )}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold uppercase text-[10px]">
              Compte Actif
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-8 space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 bg-muted/20" defaultValue={user?.displayName || ""} readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 bg-muted/20" defaultValue={user?.email || ""} readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Identifiant unique (UID)</label>
              <Input className="bg-muted/50 font-mono text-[10px] text-muted-foreground" defaultValue={user?.uid || ""} readOnly />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/10 flex justify-between p-6">
          <Button variant="outline" onClick={() => toast({ title: "Note", description: "Les modifications de profil sont désactivées pour ce prototype." })}>
            <Save className="mr-2 h-4 w-4" /> Mettre à jour
          </Button>
          <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut} className="font-bold">
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Se déconnecter
          </Button>
        </CardFooter>
      </Card>

      {/* Section Administration (Prototype Access) */}
      {!isSaaSAdmin ? (
        <Card className="border-accent/30 bg-accent/5 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <KeyRound className="h-5 w-5 text-accent" /> Accès Privilégié (Dev)
            </CardTitle>
            <CardDescription>Saisissez la clé SuperAdmin pour accéder aux outils de pilotage SaaS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                type="password" 
                placeholder="Clé de sécurité SuperAdmin..." 
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="bg-white"
              />
              <Button onClick={handleBecomeAdmin} disabled={isPromoting || !adminKey}>
                {isPromoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Activer
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Note : En production, cette promotion se fait via un audit de sécurité ou directement en base de données.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 bg-primary/5 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" /> Console Administrateur
            </CardTitle>
            <CardDescription>Vous disposez des droits de gestion globale sur la plateforme.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-primary shadow-lg" asChild>
              <Link href="/saas-admin">
                Ouvrir la Console Admin <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/20 bg-destructive/5 opacity-50 grayscale hover:grayscale-0 transition-all">
        <CardHeader className="py-4">
          <CardTitle className="text-destructive text-sm font-bold uppercase tracking-widest">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <Button variant="link" className="text-destructive p-0 h-auto text-xs font-bold">Supprimer définitivement mon accès</Button>
        </CardContent>
      </Card>
    </div>
  )
}
