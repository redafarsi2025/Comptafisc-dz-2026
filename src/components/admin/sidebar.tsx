"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShieldAlert,
  Users2,
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
  ChevronRight,
  Banknote,
  Anchor
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
  { name: "Contrôle des Coûts", href: "/saas-admin/billing-control", icon: Banknote },
  { name: "Moteur Fiscal Master", href: "/saas-admin/fiscal-engine", icon: DatabaseZap },
  { name: "Paramètres Douane", href: "/saas-admin/customs-config", icon: Anchor },
  { name: "DGI Watch AI", href: "/saas-admin/dgi-watch", icon: Eye },
  { name: "Studio Formulaires", href: "/saas-admin/forms", icon: LayoutGrid },
  { name: "Règles de Conformité", href: "/saas-admin/rules", icon: ShieldAlert },
  { name: "Support & Billetterie", href: "/saas-admin/support", icon: LifeBuoy },
  { name: "Santé & Monitoring", href: "/saas-admin/monitoring", icon: Activity },
  { name: "Gestion des Offres", href: "/saas-admin/plans", icon: Layers },
  { name: "Usine à Démos", href: "/saas-admin/demo-factory", icon: Factory },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-200 bg-white">
      <SidebarHeader className="p-6 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-4 px-1">
          <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
            <ShieldCheck className="text-white h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-primary tracking-tighter leading-none uppercase">Admin</span>
            <div className="flex items-center gap-1.5 mt-2">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">Master Root</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 pt-8 bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 uppercase text-[9px] font-black px-4 mb-6 tracking-[0.3em]">
            Global Operations
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
                      "group relative py-7 px-5 rounded-2xl transition-all duration-200 border flex items-center",
                      isActive 
                        ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 font-black scale-[1.02]" 
                        : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-primary hover:border-slate-200"
                    )}
                  >
                    <Link href={item.href} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <item.icon className={cn("h-5 w-5 transition-all duration-200", isActive ? "text-white" : "text-slate-400 group-hover:text-primary group-hover:rotate-6")} />
                        <span className="text-[10px] uppercase tracking-widest font-black">{item.name}</span>
                      </div>
                      {isActive ? (
                        <ChevronRight className="h-3 w-3 text-white/50" />
                      ) : (
                        <Zap className="h-3 w-3 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-slate-100 bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="text-slate-400 hover:text-primary hover:bg-slate-50 transition-all font-black rounded-2xl h-12 border border-transparent group"
            >
              <Link href="/dashboard" className="flex items-center justify-center gap-3">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Exit Cockpit</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
