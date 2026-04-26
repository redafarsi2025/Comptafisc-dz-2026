
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { redirect } from "next/navigation"
import { Loader2, Lock, User as UserIcon, ShieldCheck, Target } from "lucide-react"
import { doc } from "firebase/firestore"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()

  // Verify Admin status from Firestore before rendering admin content
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user]);
  const { data: adminRecord, isLoading: isAdminLoading } = useDoc(adminDocRef);

  if (isUserLoading || isAdminLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
        <ShieldCheck className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Accès Privilégié</p>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Vérification des accréditations en cours...</p>
      </div>
    </div>
  )
  
  if (!user) {
    redirect("/login")
  }

  // If user is authenticated but not a SaaS Admin, redirect to standard dashboard
  if (!adminRecord) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8FAFC]">
        <AdminSidebar />
        <SidebarInset className="bg-transparent text-foreground flex-1 flex flex-col">
          <header className="h-20 border-b bg-white/90 backdrop-blur-xl flex items-center px-8 justify-between sticky top-0 z-50 shadow-sm border-slate-200/60">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-xl shadow-primary/20 border-2 border-white ring-1 ring-slate-100">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-base font-black text-slate-900 tracking-tighter leading-tight uppercase">Pilotage Global</h2>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">Super Administrateur • Live Session</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex flex-col items-end border-r pr-6 border-slate-200">
                <span className="text-sm font-black text-primary tracking-tight">{user.email}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">NODE_ID: {user.uid.substring(0, 16)}</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="pr-4 hidden xl:block">
                   <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{user.displayName || "Admin User"}</p>
                   <p className="text-[8px] font-bold text-emerald-600 uppercase">Statut : Root</p>
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
