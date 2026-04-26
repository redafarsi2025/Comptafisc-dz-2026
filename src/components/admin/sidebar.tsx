
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShieldAlert,
  Users2,
  CreditCard,
  ArrowLeft,
  Layers,
  DatabaseZap,
  Eye,
  Factory,
  LifeBuoy,
  Activity,
  ShieldCheck,
  Target,
  LayoutGrid,
  Zap,
  Lock
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
  { name: "Executive Cockpit", href: "/saas-admin", icon: Target },
  { name: "Utilisateurs & Abos", href: "/saas-admin/users", icon: Users2 },
  { name: "Moteur Fiscal", href: "/saas-admin/fiscal-engine", icon: DatabaseZap },
  { name: "DGI Watch AI", href: "/saas-admin/dgi-watch", icon: Eye },
  { name: "Studio Formulaires", href: "/saas-admin/forms", icon: LayoutGrid },
  { name: "Règles Métier", href: "/saas-admin/rules", icon: ShieldAlert },
  { name: "Support & Tickets", href: "/saas-admin/support", icon: LifeBuoy },
  { name: "Santé Système", href: "/saas-admin/monitoring", icon: Activity },
  { name: "Gestion des Plans", href: "/saas-admin/plans", icon: Layers },
  { name: "Usine à Démos", href: "/saas-admin/demo-factory", icon: Factory },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-800 bg-[#0F172A]">
      <SidebarHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 shadow-2xl shadow-primary/20">
            <ShieldCheck className="text-primary h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-white tracking-tighter leading-none">MASTER ROOT</span>
            <div className="flex items-center gap-1 mt-1">
               <Lock className="h-2 w-2 text-accent" />
               <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Zone Sécurisée</span>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-6 bg-slate-900/20">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 uppercase text-[9px] font-black px-4 mb-4 tracking-[0.25em]">
            Administration SaaS
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
                      "group relative py-6 px-4 rounded-xl transition-all duration-300 border",
                      isActive 
                        ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 font-black" 
                        : "text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-white hover:border-slate-700"
                    )}
                  >
                    <Link href={item.href} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-accent")} />
                        <span className="text-[11px] uppercase tracking-tighter font-bold">{item.name}</span>
                      </div>
                      {isActive && (
                        <Zap className="h-3 w-3 text-accent animate-pulse" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-6 border-t border-slate-800 bg-slate-900/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="text-slate-500 hover:text-primary hover:bg-white transition-all font-black rounded-xl h-11 border border-slate-800"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-[0.1em]">Sortir du Cockpit</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
