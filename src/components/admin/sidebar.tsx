
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
  Layers,
  ChevronRight
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
import { cn } from "@/lib/utils"

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
    <Sidebar variant="sidebar" className="border-r bg-white shadow-sm">
      <SidebarHeader className="p-6 border-b bg-primary/5">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
            <Settings className="text-white h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-primary tracking-tighter leading-none">SaaS Admin</span>
            <span className="text-[10px] text-primary/60 font-bold uppercase tracking-widest mt-1">Console Master</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase text-[10px] font-black px-4 mb-4 tracking-tighter opacity-70">
            Moteur de Croissance
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1.5">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive} 
                    className={cn(
                      "group relative py-6 px-4 rounded-xl transition-all duration-200",
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary hover:text-white" 
                        : "hover:bg-primary/5 text-slate-600 hover:text-primary"
                    )}
                  >
                    <Link href={item.href} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                        <span className="text-sm font-bold">{item.name}</span>
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 text-white opacity-50" />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t bg-slate-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors font-bold rounded-lg"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="bg-slate-200 p-1.5 rounded-md group-hover:bg-primary/20">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <span className="text-xs uppercase tracking-tight">Quitter l'Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
