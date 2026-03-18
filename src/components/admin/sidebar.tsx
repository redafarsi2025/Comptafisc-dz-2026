
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileEdit,
  ShieldAlert,
  Users2,
  CreditCard,
  BarChart3,
  Settings,
  ArrowLeft,
  Briefcase
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter
} from "@/components/ui/sidebar"

const adminNavigation = [
  { name: "Dashboard Revenus", href: "/saas-admin", icon: BarChart3 },
  { name: "Formulaires DGI", href: "/saas-admin/forms", icon: FileEdit },
  { name: "Règles Métier", href: "/saas-admin/rules", icon: ShieldAlert },
  { name: "Partenaires / Revendeurs", href: "/saas-admin/partners", icon: Briefcase },
  { name: "Abonnements & Plans", href: "/saas-admin/subscriptions", icon: CreditCard },
  { name: "Utilisateurs SaaS", href: "/saas-admin/users", icon: Users2 },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-800 bg-slate-950 text-slate-200">
      <SidebarHeader className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 px-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Settings className="text-white h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">SaaS Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 uppercase text-[10px] font-bold px-4 mb-2">Pilotage</SidebarGroupLabel>
          <SidebarMenu>
            {adminNavigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href} 
                  className="hover:bg-slate-900 transition-colors py-6"
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-slate-800">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-slate-400 hover:text-white">
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Retour App Client</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
