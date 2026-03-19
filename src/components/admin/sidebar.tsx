
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
  DatabaseZap,
  Eye,
  Factory,
  LifeBuoy,
  Activity,
  ShieldCheck
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
  { name: "Utilisateurs & Abos", href: "/saas-admin/users", icon: Users2 },
  { name: "Moteur Fiscal", href: "/saas-admin/fiscal-engine", icon: DatabaseZap },
  { name: "DGI Watch Console", href: "/saas-admin/dgi-watch", icon: Eye },
  { name: "Templates DGI", href: "/saas-admin/forms", icon: FileEdit },
  { name: "Règles Métier", href: "/saas-admin/rules", icon: ShieldAlert },
  { name: "Support & Tickets", href: "/saas-admin/support", icon: LifeBuoy },
  { name: "Santé Système", href: "/saas-admin/monitoring", icon: Activity },
  { name: "Gestion des Plans", href: "/saas-admin/plans", icon: Layers },
  { name: "Usine à Démos", href: "/saas-admin/demo-factory", icon: Factory },
  { name: "Partenaires", href: "/saas-admin/partners", icon: Briefcase },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-200">
      <SidebarHeader className="p-6 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
            <ShieldCheck className="text-primary h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-slate-900 tracking-tighter leading-none">Console Admin</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Back-Office ComptaFisc</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-6 bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 uppercase text-[10px] font-black px-4 mb-4 tracking-wider">
            Menu Administration
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive} 
                    className={cn(
                      "group relative py-6 px-4 rounded-xl transition-all duration-200 border",
                      isActive 
                        ? "bg-slate-50 text-primary border-slate-200 font-black" 
                        : "text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                    )}
                  >
                    <Link href={item.href} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      {isActive && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-slate-100 bg-slate-50/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="text-slate-500 hover:text-primary hover:bg-white transition-all font-bold rounded-lg border border-transparent hover:border-slate-200"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-md border border-slate-200 shadow-sm">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <span className="text-xs uppercase tracking-tight">Quitter Console</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
