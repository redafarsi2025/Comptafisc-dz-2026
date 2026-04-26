
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
import { User, Mail, Shield, LogOut, Loader2, Save, KeyRound, ShieldCheck, ArrowRight, Target, Lock } from "lucide-react"
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

  // Vérification temps réel du statut Admin
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleBecomeAdmin = async () => {
    // Clé statique pour le prototype, à coupler avec une logique de custom claims en production
    if (adminKey !== "ADMIN2026") {
      toast({
        variant: "destructive",
        title: "Clé invalide",
        description: "Accès refusé. Veuillez contacter le support système.",
      })
      return
    }

    if (!db || !user) return
    setIsPromoting(true)

    try {
      // Inscription dans la collection privilégiée
      await setDocumentNonBlocking(doc(db, "saas_admins", user.uid), {
        id: user.uid,
        email: user.email,
        promotedAt: new Date().toISOString(),
        role: "SUPER_ADMIN"
      }, { merge: true })

      toast({ 
        title: "Accréditation Root Activée", 
        description: "Redirection vers le Command Center..." 
      });
      
      setAdminKey("");
      
      // Petit délai pour laisser Firestore synchroniser avant redirection
      setTimeout(() => {
        router.push("/saas-admin");
      }, 1500);

    } catch (e) {
      console.error(e)
    } finally {
      setIsPromoting(false)
    }
  }

  if (isUserLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-primary tracking-tighter uppercase">Paramètres du Compte</h1>
        <p className="text-muted-foreground">Gérez vos accès et accréditations sur la plateforme ComptaFisc-DZ.</p>
      </div>

      <Card className="overflow-hidden shadow-2xl border-none ring-1 ring-border">
        <div className="h-32 bg-gradient-to-r from-primary via-blue-600 to-indigo-700 border-b" />
        <CardHeader className="relative pb-0">
          <div className="absolute -top-16 left-8">
            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
              <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/400`} />
              <AvatarFallback className="text-3xl font-black bg-primary text-white uppercase tracking-tighter">DZ</AvatarFallback>
            </Avatar>
          </div>
          <div className="pl-44 flex justify-between items-start pt-4">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                {user?.displayName || user?.email?.split('@')[0] || "Utilisateur ComptaFisc"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isSaaSAdmin ? (
                  <Badge className="bg-primary text-white font-black text-[10px] tracking-widest px-3 py-1">
                    <ShieldCheck className="h-3 w-3 mr-1.5" /> SUPER ADMIN
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-500 tracking-widest">
                    UTILISATEUR STANDARD
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground font-mono">UID: {user?.uid.substring(0, 12)}...</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-12 space-y-6">
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Identité de connexion</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input className="pl-10 h-12 bg-muted/20 font-medium" defaultValue={user?.email || ""} readOnly />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/10 flex justify-between p-6">
          <p className="text-[10px] text-muted-foreground italic">Dernière connexion : {user?.metadata.lastSignInTime}</p>
          <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut} className="h-10 px-8 shadow-lg shadow-destructive/20 font-bold uppercase tracking-widest text-[10px]">
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />} 
            Clôturer Session
          </Button>
        </CardFooter>
      </Card>

      {!isSaaSAdmin ? (
        <Card className="border-2 border-dashed border-accent/30 bg-accent/5 shadow-xl relative overflow-hidden">
          <Shield className="absolute -right-8 -top-8 h-40 w-40 text-accent opacity-5" />
          <CardHeader>
            <CardTitle className="text-xl font-black text-primary flex items-center gap-3">
              <KeyRound className="h-6 w-6 text-accent" /> Accès Privilégié (Noyau SaaS)
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Saisissez la clé d'accréditation root pour activer les outils de pilotage global et le Moteur Fiscal Master.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input 
                  type="password" 
                  placeholder="Saisissez la clé système..." 
                  className="pl-10 h-12 bg-white border-accent/20 focus-visible:ring-accent" 
                  value={adminKey} 
                  onChange={(e) => setAdminKey(e.target.value)} 
                />
              </div>
              <Button onClick={handleBecomeAdmin} disabled={isPromoting || !adminKey} className="bg-primary h-12 px-10 shadow-lg shadow-primary/20">
                {isPromoting ? <Loader2 className="animate-spin h-5 w-5" /> : "Vérifier & Activer"}
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 italic">Uniquement pour les administrateurs ComptaFisc-DZ certifiés.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-2xl bg-slate-900 text-white relative overflow-hidden p-2">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black text-accent uppercase tracking-tighter">Command Center Prêt</CardTitle>
                <CardDescription className="text-slate-400 font-medium">Vous disposez des droits Root sur l'infrastructure ComptaFisc-DZ.</CardDescription>
              </div>
              <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                <Target className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button className="w-full bg-primary hover:bg-primary/90 h-14 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/40 group" asChild>
              <Link href="/saas-admin">
                Ouvrir le Pilotage Global <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </CardContent>
          <CardFooter className="p-4 bg-white/5 mt-2 rounded-xl flex justify-center">
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
               <ShieldCheck className="h-3 w-3 text-emerald-500" /> Session Admin Sécurisée par Noyau V2.5
             </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
