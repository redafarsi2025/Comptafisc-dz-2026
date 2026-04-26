
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { useRouter } from "next/navigation"
import { ShieldCheck, Target, Zap, Bell, User as UserIcon, Lock, ArrowLeft } from "lucide-react"
import { doc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()

  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord, isLoading: isAdminLoading, error: adminError } = useDoc(adminDocRef);

  // État de chargement haute sécurité
  if (isUserLoading || isAdminLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] gap-6 overflow-hidden">
        <div className="relative">
          <div className="h-32 w-32 rounded-full border-4 border-accent/10 border-t-accent animate-spin" />
          <ShieldCheck className="absolute inset-0 m-auto h-12 w-12 text-accent animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-black text-white uppercase tracking-[0.4em]">Master Node Authentication</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Validation du certificat root...</p>
        </div>
      </div>
    );
  }
  
  // Si l'utilisateur n'est pas Admin (Définitif)
  if (!user || !adminRecord) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-3xl shadow-2xl border border-red-100">
           <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <Lock className="h-10 w-10" />
           </div>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Accès Restreint</h1>
           <p className="text-sm text-muted-foreground leading-relaxed">
             Votre compte ne dispose pas des accréditations SuperAdmin nécessaires pour accéder au noyau SaaS ComptaFisc-DZ.
           </p>
           <div className="pt-4 flex flex-col gap-3">
             <Button className="w-full bg-primary" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard</Link>
             </Button>
             <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/profile">Vérifier mon profil</Link>
             </Button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#0F172A]">
        <AdminSidebar />
        <SidebarInset className="bg-transparent text-slate-100 flex-1 flex flex-col">
          <header className="h-20 border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-2xl flex items-center px-8 justify-between sticky top-0 z-50 shadow-2xl">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-xl shadow-primary/20 border border-white/10 group">
                <Target className="h-6 w-6 text-white group-hover:rotate-45 transition-transform duration-500" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-base font-black text-white tracking-tighter leading-tight uppercase">Admin Command Center</h2>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em]">Live Production Node • Root v2.5</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex gap-2 mr-4 border-r border-slate-800 pr-6">
                 <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-2xl hover:bg-slate-800 text-slate-400">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-destructive rounded-full border-2 border-[#0F172A]" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-slate-800">
                    <Zap className="h-4 w-4 text-amber-500" />
                 </Button>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/40 p-2 rounded-2xl border border-slate-700 shadow-inner">
                <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center border border-slate-600 shadow-lg">
                  <UserIcon className="h-5 w-5 text-slate-300" />
                </div>
                <div className="flex flex-col pr-2">
                   <span className="text-[10px] font-black text-white uppercase tracking-tighter">Root Admin</span>
                   <span className="text-[8px] text-emerald-500 uppercase font-black tracking-widest">SÉCURISÉ</span>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
