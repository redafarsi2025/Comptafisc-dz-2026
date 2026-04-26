
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { redirect } from "next/navigation"
import { ShieldCheck, Target, Zap, Bell, User as UserIcon, Loader2, Lock } from "lucide-react"
import { doc } from "firebase/firestore"
import { Button } from "@/components/ui/button"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()

  // Vérification stricte du statut Admin dans Firestore
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord, isLoading: isAdminLoading } = useDoc(adminDocRef);

  if (isUserLoading || isAdminLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 gap-6">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-accent/10 border-t-accent animate-spin" />
        <ShieldCheck className="absolute inset-0 m-auto h-8 w-8 text-accent animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Accès Privilégié</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vérification des accréditations...</p>
      </div>
    </div>
  )
  
  if (!user) {
    redirect("/login")
  }

  // Redirection immédiate si l'utilisateur n'est pas admin pour protéger le périmètre
  if (!adminRecord) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#0F172A]">
        <AdminSidebar />
        <SidebarInset className="bg-transparent text-slate-100 flex-1 flex flex-col">
          <header className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center px-8 justify-between sticky top-0 z-50 shadow-2xl">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-xl shadow-primary/20 border border-white/10">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-base font-black text-white tracking-tighter leading-tight uppercase">Admin Command Center</h2>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em]">Live Node • Root v2.5</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex gap-2 mr-4 border-r border-slate-800 pr-6">
                 <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-slate-800 text-slate-400">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-destructive rounded-full" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-800">
                    <Zap className="h-4 w-4 text-amber-500" />
                 </Button>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700 shadow-inner">
                <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center border border-slate-600">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex flex-col pr-2">
                   <span className="text-[10px] font-black text-white uppercase tracking-tighter">Root Admin</span>
                   <span className="text-[8px] text-slate-500 uppercase font-bold">Session Active</span>
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
  )
}
