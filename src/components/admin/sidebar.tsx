
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
  Lock,
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
  { name: "Executive Cockpit", href: "/saas-admin", icon: Target },
  { name: "Utilisateurs & Abos", href: "/saas-admin/users", icon: Users2 },
  { name: "Moteur Fiscal Master", href: "/saas-admin/fiscal-engine", icon: DatabaseZap },
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
    <Sidebar variant="sidebar" className="border-r border-slate-800 bg-[#0F172A]">
      <SidebarHeader className="p-6 border-b border-slate-800 bg-[#0F172A]">
        <div className="flex items-center gap-4 px-1">
          <div className="bg-primary/20 p-2.5 rounded-2xl border border-primary/30 shadow-2xl shadow-primary/20 group-hover:scale-110 transition-transform">
            <ShieldCheck className="text-primary h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-white tracking-tighter leading-none italic">MASTER ROOT</span>
            <div className="flex items-center gap-1.5 mt-2">
               <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
               <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Encrypted Session</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 pt-8 bg-[#0F172A]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-600 uppercase text-[9px] font-black px-4 mb-6 tracking-[0.3em]">
            Global Operations
          </SidebarGroupLabel>
          <SidebarMenu className="gap-2">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive} 
                    className={cn(
                      "group relative py-7 px-5 rounded-2xl transition-all duration-300 border flex items-center",
                      isActive 
                        ? "bg-primary text-white border-primary shadow-2xl shadow-primary/30 font-black scale-[1.02]" 
                        : "text-slate-500 border-transparent hover:bg-slate-800/40 hover:text-white hover:border-slate-700"
                    )}
                  >
                    <Link href={item.href} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <item.icon className={cn("h-5 w-5 transition-all duration-300", isActive ? "text-white" : "text-slate-600 group-hover:text-accent group-hover:rotate-6")} />
                        <span className="text-[10px] uppercase tracking-widest font-black">{item.name}</span>
                      </div>
                      {isActive ? (
                        <ChevronRight className="h-3 w-3 text-accent animate-bounce-x" />
                      ) : (
                        <Zap className="h-3 w-3 text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-slate-800 bg-[#0F172A]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="text-slate-500 hover:text-primary hover:bg-white transition-all font-black rounded-2xl h-12 border border-slate-800 group shadow-inner"
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
