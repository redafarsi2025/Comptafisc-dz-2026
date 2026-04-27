"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUser, useAuth, useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"
import { Mail, Shield, LogOut, Loader2, KeyRound, ShieldCheck, ArrowRight, Target, Lock, Sparkles } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [adminKey, setAdminKey] = React.useState("")
  const [isPromoting, setIsPromoting] = React.useState(false)

  // Vérification temps réel du statut Admin via le noyau Master
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord, isLoading: isAdminCheckLoading } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur lors de la déconnexion" });
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleBecomeAdmin = async () => {
    // Clé système Master (En production, ceci serait géré via une Cloud Function sécurisée)
    if (adminKey !== "ADMIN2026") {
      toast({
        variant: "destructive",
        title: "Clé d'accréditation invalide",
        description: "L'accès au noyau SaaS est restreint. Tentative enregistrée.",
      })
      return
    }

    if (!db || !user) return
    setIsPromoting(true)

    try {
      // Promotion immédiate dans la collection saas_admins
      await setDocumentNonBlocking(doc(db, "saas_admins", user.uid), {
        id: user.uid,
        email: user.email,
        promotedAt: new Date().toISOString(),
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      }, { merge: true })

      toast({ 
        title: "Privilèges Root Activés", 
        description: "Accréditation SuperAdmin validée par le noyau système.",
      });
      
      setAdminKey("");
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Échec de l'accréditation" });
    } finally {
      setIsPromoting(false)
    }
  }

  if (isUserLoading || isAdminCheckLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synchronisation Profil...</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 text-start">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-primary tracking-tighter uppercase italic leading-none">Gestion du Compte</h1>
        <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Identité numérique & Accréditations SaaS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLONNE GAUCHE : IDENTITÉ */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="overflow-hidden shadow-2xl border-none ring-1 ring-border rounded-[2.5rem] bg-white">
            <div className="h-32 bg-gradient-to-r from-primary via-blue-600 to-indigo-700 border-b relative">
               <div className="absolute inset-0 opacity-10 bg-[url('https://picsum.photos/seed/tech/800/200')] bg-cover mix-blend-overlay" />
            </div>
            <CardHeader className="relative pb-0">
              <div className="absolute -top-16 left-8">
                <Avatar className="h-32 w-32 border-[6px] border-white shadow-2xl rounded-[2.5rem]">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/400`} />
                  <AvatarFallback className="text-3xl font-black bg-slate-100 text-primary uppercase tracking-tighter italic">DZ</AvatarFallback>
                </Avatar>
              </div>
              <div className="pl-44 flex justify-between items-start pt-6">
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-black tracking-tighter uppercase text-slate-900 leading-none">
                    {user?.displayName || user?.email?.split('@')[0] || "Expert"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isSaaSAdmin ? (
                      <Badge className="bg-primary text-white font-black text-[9px] tracking-widest px-3 py-1 rounded-full shadow-lg shadow-primary/20">
                        <ShieldCheck className="h-3 w-3 mr-1.5" /> SUPER ADMIN ROOT
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-bold text-slate-400 tracking-widest uppercase rounded-full">
                        Utilisateur Standard
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-16 space-y-8">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Email de connexion</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                    <Input className="pl-12 h-12 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700" defaultValue={user?.email || ""} readOnly />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center border shadow-sm text-primary">
                     <Target className="h-6 w-6" />
                   </div>
                   <div className="text-start">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut de Sécurité</p>
                     <p className="text-sm font-bold text-slate-900">Protégé par Master Node v2.6</p>
                   </div>
                </div>
                <Button variant="ghost" className="text-[10px] font-black uppercase text-primary tracking-widest">Logs</Button>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-slate-50/50 flex justify-between p-8">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dernière activité</span>
                <span className="text-[10px] font-bold text-slate-600">{user?.metadata.lastSignInTime}</span>
              </div>
              <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut} className="h-11 px-8 shadow-xl shadow-red-500/10 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl">
                {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />} 
                Sortie Système
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* COLONNE DROITE : ACCÈS PRIVILÉGIÉ */}
        <div className="space-y-8">
          {!isSaaSAdmin ? (
            <Card className="border-2 border-dashed border-accent/40 bg-accent/5 shadow-2xl relative overflow-hidden rounded-[2.5rem]">
              <div className="absolute -right-8 -top-8 h-40 w-40 text-accent opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                <Shield className="h-full w-full" />
              </div>
              <CardHeader className="text-start">
                <CardTitle className="text-xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase italic">
                  <KeyRound className="h-6 w-6 text-accent" /> Accès Privilégié
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 leading-relaxed uppercase mt-2">
                  L'activation de l'accès root débloque la console de pilotage global SaaS.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4 text-start">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-accent tracking-widest px-1">Clé d'accréditation Master</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password" 
                      placeholder="Saisissez le certificat..." 
                      className="pl-12 h-12 bg-white border-accent/20 rounded-2xl focus-visible:ring-accent font-mono" 
                      value={adminKey} 
                      onChange={(e) => setAdminKey(e.target.value)} 
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleBecomeAdmin} 
                  disabled={isPromoting || !adminKey} 
                  className="w-full bg-primary h-14 rounded-2xl shadow-2xl shadow-primary/20 font-black uppercase text-[11px] tracking-[0.2em]"
                >
                  {isPromoting ? <Loader2 className="animate-spin h-5 w-5" /> : <><Sparkles className="mr-2 h-4 w-4" /> Activer Root Node</>}
                </Button>
                <p className="text-[9px] text-slate-400 font-bold italic leading-relaxed text-center">
                  "Réservé exclusivement aux auditeurs et administrateurs certifiés ComptaFisc-DZ."
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-2xl bg-slate-900 text-white relative overflow-hidden rounded-[2.5rem] group p-1">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
              <CardHeader className="relative text-start">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                    <Target className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-black text-[8px] tracking-widest h-6 px-3">NODE CONNECTÉ</Badge>
                </div>
                <CardTitle className="text-2xl font-black text-accent uppercase tracking-tighter italic">Command Center</CardTitle>
                <CardDescription className="text-slate-400 font-medium text-xs leading-relaxed uppercase mt-2">
                  Pilotage global de l'infrastructure, du moteur fiscal et des dossiers clients.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative">
                <Button className="w-full bg-primary hover:bg-blue-700 h-16 text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 rounded-3xl group" asChild>
                  <Link href="/saas-admin">
                    Ouvrir le Pilotage Global <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                  </Link>
                </Button>
              </CardContent>
              <CardFooter className="p-6 relative bg-white/5 mt-4 rounded-b-[2.3rem] flex justify-center">
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                   <ShieldCheck className="h-3 w-3 text-emerald-500" /> Authentification Root v2.6 Sécurisée
                 </div>
              </CardFooter>
            </Card>
          )}

          <div className="p-8 bg-blue-50 border-2 border-blue-100 rounded-[2.5rem] flex items-start gap-5 shadow-inner text-start relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-5"><Landmark className="h-24 w-24 text-blue-900" /></div>
             <Info className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
             <div className="text-[11px] text-blue-900 leading-relaxed font-medium">
               <p className="font-black uppercase tracking-tight mb-2">Note de Sécurité :</p>
               <p className="opacity-80">
                 Toute modification via le Command Center est tracée et auditée dans l'Audit Log global. Veillez à utiliser cet accès uniquement pour des opérations de maintenance ou de supervision autorisées.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
