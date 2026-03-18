"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  Plus,
  User as UserIcon,
  LogOut,
  Library,
  BookOpenCheck,
  FileBarChart,
  FileStack,
  ClipboardList,
  CalendarCheck,
  HardHat,
  Contact,
  Briefcase,
  Layers,
  MessagesSquare,
  Repeat,
  Landmark,
  ShieldAlert,
  BookOpen,
  CalendarDays
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
  useSidebar
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase, initiateAnonymousSignIn } from "@/firebase"
import { collection, query, where, doc, setDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { toast } from "@/hooks/use-toast"

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Saisie Comptable", href: "/dashboard/accounting", icon: BookText },
  { name: "Facturation", href: "/dashboard/invoicing", icon: Receipt },
  { name: "Paie & Livre de Paie", href: "/dashboard/payroll", icon: Users },
  { name: "Déclarations Fisc", href: "/dashboard/declarations", icon: FileText },
  { name: "Assistant IA", href: "/dashboard/assistant", icon: MessageSquareMore },
  { name: "Capture OCR", href: "/dashboard/ocr", icon: Camera },
]

const socialNavigation = [
  { name: "Livre de Paie", href: "/dashboard/payroll/ledger", icon: BookOpen },
  { name: "Bordereau DAC", href: "/dashboard/payroll/dac", icon: CalendarCheck },
  { name: "DAS Annuelle", href: "/dashboard/payroll/das", icon: ClipboardList },
  { name: "G50 ter (Trimestriel)", href: "/dashboard/declarations/g50ter", icon: CalendarDays },
  { name: "CACOBATPH", href: "/dashboard/payroll/cacobatph", icon: HardHat },
]

const cabinetNavigation = [
  { name: "Dashboard Cabinet", href: "/dashboard/cabinet", icon: Layers },
  { name: "Collaboration Hub", href: "/dashboard/cabinet/collaboration", icon: MessagesSquare },
  { name: "G50 Groupées", href: "/dashboard/cabinet/bulk-g50", icon: Repeat },
  { name: "Rapprochement Bancaire", href: "/dashboard/cabinet/bank-recon", icon: Landmark },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const [currentTenantId, setCurrentTenantId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);

  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);

  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (currentTenantId) return tenants.find(t => t.id === currentTenantId) || tenants[0];
    return tenants[0];
  }, [tenants, currentTenantId]);

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (e) {
      console.error(e)
    }
  }

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
                    <span className="font-semibold text-sidebar-foreground truncate w-32">
                      {isTenantsLoading ? "Chargement..." : (currentTenant?.raisonSociale || "Aucun dossier")}
                    </span>
                    <span className="text-[10px] text-sidebar-foreground/70">
                      {currentTenant ? `${currentTenant.regimeFiscal}` : "Créer un dossier"}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {tenants?.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => setCurrentTenantId(t.id)} className="cursor-pointer">
                    <div className="flex flex-col">
                      <span className="font-medium">{t.raisonSociale}</span>
                      <span className="text-[10px] text-muted-foreground">{t.regimeFiscal} - {t.nif}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Menu Principal</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name} className="hover:bg-sidebar-accent">
                  <Link href={item.href}><item.icon /><span>{item.name}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Déclarations Sociales</SidebarGroupLabel>
          <SidebarMenu>
            {socialNavigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name} className="hover:bg-sidebar-accent">
                  <Link href={item.href}><item.icon /><span>{item.name}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Portail Cabinet</SidebarGroupLabel>
          <SidebarMenu>
            {cabinetNavigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name} className="hover:bg-sidebar-accent">
                  <Link href={item.href}><item.icon /><span>{item.name}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Système</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/saas-admin")} tooltip="Admin SaaS" className="text-accent hover:bg-accent/10">
                <Link href="/saas-admin"><ShieldAlert /><span>Administration SaaS</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Gestion</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/contacts"} tooltip="Tiers (Clients/Forn.)">
                <Link href="/dashboard/contacts"><Contact /><span>Tiers (Clients/Fourn.)</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip="Paramètres Dossier">
                <Link href="/dashboard/settings"><Settings /><span>Paramètres Dossier</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={`https://picsum.photos/seed/${user?.uid || 'user'}/40/40`} />
                    <AvatarFallback className="rounded-lg">DZ</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 text-left text-sm leading-tight">
                    <span className="font-semibold text-sidebar-foreground truncate w-32">
                      {user?.displayName || "Comptable"}
                    </span>
                    <span className="text-xs text-sidebar-foreground/70">Expert Cabinet</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer"><UserIcon className="h-4 w-4" /> Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive"><LogOut className="h-4 w-4" /> Déconnexion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
