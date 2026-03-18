"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Receipt,
  BookText,
  Users,
  FileText,
  MessageSquareMore,
  Camera,
  Settings,
  ChevronDown,
  Building2,
  PieChart,
  BadgeCheck
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarMenuBadge,
  useSidebar
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Saisie Comptable", href: "/dashboard/accounting", icon: BookText },
  { name: "Facturation", href: "/dashboard/invoicing", icon: Receipt },
  { name: "Paie & Social", href: "/dashboard/payroll", icon: Users },
  { name: "Déclarations (G50)", href: "/dashboard/declarations", icon: FileText },
  { name: "Assistant Fiscal", href: "/dashboard/assistant", icon: MessageSquareMore },
  { name: "OCR Ingestion", href: "/dashboard/ocr", icon: Camera },
  { name: "Analyses", href: "/dashboard/analytics", icon: PieChart },
]

const dossiers = [
  { id: "1", name: "Sarl Altech DZ", role: "Comptable" },
  { id: "2", name: "Eurl Méditrans", role: "Admin" },
  { id: "3", name: "Groupement Sud", role: "Dossier Manager" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const [currentDossier, setCurrentDossier] = React.useState(dossiers[0])

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent transition-colors">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Building2 className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sidebar-foreground">{currentDossier.name}</span>
                    <span className="text-xs text-sidebar-foreground/70">{currentDossier.role}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {dossiers.map((dossier) => (
                  <DropdownMenuItem
                    key={dossier.id}
                    onClick={() => setCurrentDossier(dossier)}
                    className="cursor-pointer"
                  >
                    {dossier.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Principal</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.name}
                  className="hover:bg-sidebar-accent transition-all duration-200"
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src="https://picsum.photos/seed/accountant/40/40" />
                <AvatarFallback className="rounded-lg">DZ</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 text-left text-sm leading-tight">
                <span className="font-semibold text-sidebar-foreground">Ahmed Mohamed</span>
                <span className="text-xs text-sidebar-foreground/70">Expert-Comptable</span>
              </div>
              <Settings className="ml-auto size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}