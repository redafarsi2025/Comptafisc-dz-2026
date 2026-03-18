
"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser } from "@/firebase"
import { redirect } from "next/navigation"
import { Loader2, Lock, User as UserIcon, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()

  if (isUserLoading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initialisation de la console...</p>
      </div>
    </div>
  )
  
  if (!user) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8FAFC]">
        <AdminSidebar />
        <SidebarInset className="bg-transparent text-foreground flex-1 flex flex-col">
          <header className="h-20 border-b bg-white/80 backdrop-blur-md flex items-center px-8 justify-between sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-slate-900 leading-tight">Accès Privilégié</h2>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Super Admin Connecté</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end border-r pr-6 border-slate-200">
                <span className="text-sm font-black text-primary">{user.email}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: {user.uid.substring(0, 12)}...</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-lg shadow-primary/20 border-2 border-white">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </header>
          <main className="flex-1 p-8 overflow-auto">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
