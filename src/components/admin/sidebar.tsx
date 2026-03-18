
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileEdit,
  ShieldAlert,
  Users2,
  CreditCard,
  BarChart3,
  Settings,
  ArrowLeft,
  Briefcase,
  Layers
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter
} from "@/components/ui/sidebar"

const adminNavigation = [
  { name: "Pilotage Revenus", href: "/saas-admin", icon: BarChart3 },
  { name: "Gestion des Plans", href: "/saas-admin/plans", icon: Layers },
  { name: "Formulaires DGI", href: "/saas-admin/forms", icon: FileEdit },
  { name: "Règles Métier", href: "/saas-admin/rules", icon: ShieldAlert },
  { name: "Partenaires", href: "/saas-admin/partners", icon: Briefcase },
  { name: "Abonnements", href: "/saas-admin/subscriptions", icon: CreditCard },
  { name: "Utilisateurs SaaS", href: "/saas-admin/users", icon: Users2 },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" className="border-r bg-card text-foreground">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 px-2">
          <div className="bg-primary p-1.5 rounded-lg shadow-md">
            <Settings className="text-white h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-primary tracking-tight">SaaS Manager</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase text-[10px] font-bold px-4 mb-4">Moteur de Croissance</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {adminNavigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href} 
                  className="hover:bg-primary/10 hover:text-primary transition-all py-6 rounded-none border-l-4 border-l-transparent data-[active=true]:border-l-primary data-[active=true]:bg-primary/5"
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-bold">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground hover:text-primary font-bold">
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Quitter l'Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
