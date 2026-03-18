
"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser } from "@/firebase"
import { redirect } from "next/navigation"
import { Loader2, Lock } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()

  // Note: Dans une application réelle, nous vérifierions un claim custom 'isAdmin'
  // Pour le prototype, on autorise l'accès si l'utilisateur est connecté
  if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  
  if (!user) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-950">
        <AdminSidebar />
        <SidebarInset className="bg-slate-900 text-slate-100 flex-1 flex flex-col">
          <header className="h-16 border-b border-slate-800 flex items-center px-8 justify-between bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-mono uppercase tracking-widest">Zone d'administration sécurisée</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-200">{user.email}</span>
                <span className="text-[10px] text-emerald-500 font-mono">Super Admin Access</span>
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
