
"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useUser } from "@/firebase"
import { redirect } from "next/navigation"
import { Loader2, Lock, User as UserIcon } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()

  if (isUserLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
  
  if (!user) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="bg-background text-foreground flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center px-8 justify-between sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">Console Administration Sécurisée</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold">{user.email}</span>
                <span className="text-[10px] text-emerald-600 font-bold uppercase">Accès Super Admin</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-primary" />
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
