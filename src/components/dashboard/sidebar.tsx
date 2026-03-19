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
  User as UserIcon,
  LogOut,
  Library,
  FileBarChart,
  FileStack,
  ClipboardList,
  CalendarCheck,
  HardHat,
  Contact,
  Layers,
  MessagesSquare,
  Repeat,
  Landmark,
  ShieldAlert,
  BookOpen,
  CalendarDays,
  Eye,
  GraduationCap,
  FileBadge,
  TrendingDown,
  BrainCircuit,
  PieChart,
  Plus
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
import { collection, query, where } from "firebase/firestore"
import { signOut } from "firebase/auth"

// 1. Pilotage & Décision
const pilotageNav = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
]

// 2. Comptabilité SCF
const accountingNav = [
  { name: "Saisie Journal", href: "/dashboard/accounting", icon: BookText },
  { name: "Grand Livre", href: "/dashboard/accounting/ledger", icon: Library },
  { name: "États Financiers", href: "/dashboard/accounting/financial-statements", icon: FileBarChart },
  { name: "Registre des Immos", href: "/dashboard/accounting/assets", icon: TrendingDown },
  { name: "Rapprochement Bancaire", href: "/dashboard/cabinet/bank-recon", icon: Landmark },
]

// 3. Activité & Tiers
const businessNav = [
  { name: "Facturation Émise", href: "/dashboard/invoicing", icon: Receipt },
  { name: "Tiers (Clients/Fourn.)", href: "/dashboard/contacts", icon: Contact },
]

// 4. Ressources Humaines & Paie
const payrollNav = [
  { name: "Registre du Personnel", href: "/dashboard/payroll", icon: Users },
  { name: "Livre de Paie", href: "/dashboard/payroll/ledger", icon: BookOpen },
  { name: "Bordereau DAC (CNAS)", href: "/dashboard/payroll/dac", icon: CalendarCheck },
  { name: "DAS Annuelle", href: "/dashboard/payroll/das", icon: ClipboardList },
  { name: "CACOBATPH (BTP)", href: "/dashboard/payroll/cacobatph", icon: HardHat },
]

// 5. Fiscalité DGI
const fiscalNav = [
  { name: "Déclarations (G50/G12)", href: "/dashboard/declarations", icon: FileText },
  { name: "G50 ter (Trimestriel)", href: "/dashboard/declarations/g50ter", icon: CalendarDays },
  { name: "Liasse Fiscale (G4)", href: "/dashboard/declarations/g4", icon: FileStack },
  { name: "Existence (G8)", href: "/dashboard/declarations/g8", icon: FileBadge },
  { name: "Taxe Apprentissage", href: "/dashboard/declarations/taxe-apprentissage", icon: GraduationCap },
]

// 6. Centre IA & Veille
const aiNav = [
  { name: "Assistant Fiscal IA", href: "/dashboard/assistant", icon: MessageSquareMore },
  { name: "Capture OCR (Gemini)", href: "/dashboard/ocr", icon: Camera },
  { name: "DGI Watch (Veille)", href: "/dashboard/cabinet/dgi-watch", icon: Eye },
]

// 7. Expert Cabinet (Multi-dossiers)
const cabinetNav = [
  { name: "Dashboard Cabinet", href: "/dashboard/cabinet", icon: Layers },
  { name: "Collaboration Hub", href: "/dashboard/cabinet/collaboration", icon: MessagesSquare },
  { name: "G50 Groupées (Bulk)", href: "/dashboard/cabinet/bulk-g50", icon: Repeat },
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

  const NavGroup = ({ label, items }: { label: string, items: any[] }) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase tracking-[0.15em] text-[9px] font-black mt-2">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item: any) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name} className="hover:bg-sidebar-accent group">
              <Link href={item.href}>
                <item.icon className={pathname === item.href ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary transition-colors"} />
                <span className="font-medium">{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-sidebar-border/50">
      <SidebarHeader className="bg-sidebar p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent transition-all duration-200 border border-transparent hover:border-sidebar-border">
                  <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                    <Building2 className="size-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none ml-2">
                    <span className="font-bold text-sm text-sidebar-foreground truncate w-32 uppercase tracking-tighter">
                      {isTenantsLoading ? "..." : (currentTenant?.raisonSociale || "Sélectionnez un dossier")}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-sidebar-foreground/50 uppercase">
                        {currentTenant ? `${currentTenant.regimeFiscal}` : "Expert-comptable"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-sidebar-foreground/30" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2 shadow-2xl rounded-xl">
                <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dossiers actifs</div>
                {tenants?.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => setCurrentTenantId(t.id)} className="cursor-pointer rounded-lg mb-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase">{t.raisonSociale}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">NIF: {t.nif || 'Non renseigné'}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer font-bold text-primary text-xs">
                  <Link href="/dashboard/settings"><Plus className="mr-2 h-3 w-3" /> Configurer un nouveau dossier</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label="Pilotage" items={pilotageNav} />
        <NavGroup label="Comptabilité SCF" items={accountingNav} />
        <NavGroup label="Activité & Tiers" items={businessNav} />
        <NavGroup label="RH & Paie" items={payrollNav} />
        <NavGroup label="Fiscalité DGI" items={fiscalNav} />
        <NavGroup label="Innovation & Veille" items={aiNav} />
        
        {currentTenant?.plan === 'CABINET' && (
          <NavGroup label="Expert Cabinet" items={cabinetNav} />
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase tracking-[0.15em] text-[9px] font-black mt-2">Configuration</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip="Paramètres">
                <Link href="/dashboard/settings"><Settings /><span>Paramètres Dossier</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/saas-admin")} className="text-accent hover:bg-accent/5">
                <Link href="/saas-admin"><ShieldAlert className="text-accent" /><span>Console SaaS Admin</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4 bg-sidebar-accent/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent group">
                  <Avatar className="h-9 w-9 rounded-xl border-2 border-white/10 shadow-sm">
                    <AvatarImage src={`https://picsum.photos/seed/${user?.uid || 'user'}/40/40`} />
                    <AvatarFallback className="rounded-xl bg-primary text-white font-bold">DZ</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 text-left text-sm leading-tight ml-2">
                    <span className="font-bold text-sidebar-foreground truncate w-32">
                      {user?.displayName || "Mon Compte"}
                    </span>
                    <span className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-tighter">Expert-Comptable</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-sidebar-foreground/30" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-64 p-2 shadow-2xl rounded-xl">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer font-medium text-sm py-2"><UserIcon className="h-4 w-4" /> Mon Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive font-bold text-sm py-2"><LogOut className="h-4 w-4" /> Déconnexion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
