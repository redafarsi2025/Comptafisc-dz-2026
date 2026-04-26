
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { redirect } from "next/navigation"
import { Loader2, ShieldCheck, Target, Zap, Bell, Search, User as UserIcon } from "lucide-react"
import { doc } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()

  // Verify Admin status from Firestore
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord, isLoading: isAdminLoading } = useDoc(adminDocRef);

  if (isUserLoading || isAdminLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
        <ShieldCheck className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Accès Privilégié</p>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Vérification des accréditations...</p>
      </div>
    </div>
  )
  
  if (!user) {
    redirect("/login")
  }

  // Redirect non-admins to standard dashboard to prevent seeing client UI inside /saas-admin
  if (!adminRecord) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8FAFC]">
        <AdminSidebar />
        <SidebarInset className="bg-transparent text-foreground flex-1 flex flex-col">
          <header className="h-20 border-b bg-white/90 backdrop-blur-xl flex items-center px-8 justify-between sticky top-0 z-50 shadow-sm border-slate-200/60">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-xl shadow-primary/20 border-2 border-white ring-1 ring-slate-100">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base font-black text-slate-900 tracking-tighter leading-tight uppercase">Pilotage Global</h2>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">Admin Root • Live Node</span>
                  </div>
                </div>
              </div>
              <div className="relative hidden xl:block">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
                <Input 
                  placeholder="Chercher dossier, NIF, UID..." 
                  className="w-[400px] h-9 pl-9 bg-slate-50 border-slate-200 text-xs rounded-xl focus-visible:ring-primary/20"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex gap-2 mr-4 border-r pr-6 border-slate-200">
                 <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-slate-100">
                    <Bell className="h-4 w-4 text-slate-500" />
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-destructive rounded-full" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                    <Zap className="h-4 w-4 text-amber-500" />
                 </Button>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-8 overflow-auto">
            <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700 slide-in-from-bottom-2">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
