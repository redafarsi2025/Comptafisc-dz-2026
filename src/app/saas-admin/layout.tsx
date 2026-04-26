
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { useRouter } from "next/navigation"
import { ShieldCheck, Target, Zap, Bell, User as UserIcon, Lock, ArrowLeft, Loader2 } from "lucide-react"
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
  const { data: adminRecord, isLoading: isAdminLoading } = useDoc(adminDocRef);

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  if (!mounted || isUserLoading || isAdminLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-6 overflow-hidden">
        <div className="relative">
          <div className="h-32 w-32 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
          <ShieldCheck className="absolute inset-0 m-auto h-12 w-12 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-black text-slate-900 uppercase tracking-[0.4em]">Master Node Authentication</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Validation du certificat root...</p>
        </div>
      </div>
    );
  }
  
  if (!user || !adminRecord) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
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
           </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8FAFC]">
        <AdminSidebar />
        <SidebarInset className="bg-transparent text-slate-900 flex-1 flex flex-col">
          <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center px-8 justify-between sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 border border-white/10 group">
                <Target className="h-6 w-6 text-white group-hover:rotate-45 transition-transform duration-500" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-base font-black text-slate-900 tracking-tighter leading-tight uppercase">Command Center</h2>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">Live Production Node • v2.6 Light</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex gap-2 mr-4 border-r border-slate-200 pr-6">
                 <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-2xl hover:bg-slate-100 text-slate-600">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-destructive rounded-full border-2 border-white" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-slate-100">
                    <Zap className="h-4 w-4 text-amber-500" />
                 </Button>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col pr-2">
                   <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Root Admin</span>
                   <span className="text-[8px] text-emerald-600 uppercase font-black tracking-widest">AUTORISÉ</span>
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
