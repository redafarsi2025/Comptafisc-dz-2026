
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Bell, Search, Globe, Loader2 } from "lucide-react"
import { useUser, useFirestore } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()

  // Synchronisation du profil utilisateur vers Firestore
  React.useEffect(() => {
    if (user && !isUserLoading && db && !user.isAnonymous) {
      const profileRef = doc(db, "userProfiles", user.uid)
      
      // On utilise setDoc avec merge: true pour créer le profil s'il n'existe pas
      // sans écraser les données existantes (comme les rôles)
      setDoc(profileRef, {
        id: user.uid,
        email: user.email,
        firstName: user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Utilisateur',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'DZ',
        updatedAt: new Date().toISOString(),
        // On ne définit createdAt que s'il n'existe pas via une logique simple ou merge
      }, { merge: true }).catch(console.error)
    }
  }, [user, isUserLoading, db])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <React.Suspense fallback={<div className="w-64 bg-white border-r flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <DashboardSidebar />
        </React.Suspense>
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-4 shadow-sm transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Rechercher (Compte, Facture, Client...)"
                  className="w-72 rounded-full border bg-muted pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span className="ml-1 text-[10px] font-bold">FR</span>
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <React.Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              {children}
            </React.Suspense>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
