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
  FileBarChart
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
  { name: "Paie & Social", href: "/dashboard/payroll", icon: Users },
  { name: "Déclarations Fisc", href: "/dashboard/declarations", icon: FileText },
  { name: "Assistant IA", href: "/dashboard/assistant", icon: MessageSquareMore },
  { name: "Capture OCR", href: "/dashboard/ocr", icon: Camera },
]

const legalBooks = [
  { name: "Livre-Journal", href: "/dashboard/accounting/journal", icon: BookOpenCheck },
  { name: "Grand Livre", href: "/dashboard/accounting/ledger", icon: Library },
  { name: "États Financiers", href: "/dashboard/accounting/financial-statements", icon: FileBarChart },
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

  const createDefaultTenant = async () => {
    if (!db || !user) return;
    const newTenantRef = doc(collection(db, "tenants"));
    
    const tenantData = {
      id: newTenantRef.id,
      raisonSociale: "Nouveau Dossier " + (user.displayName || "Client"),
      formeJuridique: "EURL",
      nif: "000000000000000",
      nis: "",
      registreCommerce: "",
      articleImposition: "",
      dateCreation: new Date().toISOString(),
      capitalSocial: 100000,
      adresse: { rue: "", commune: "", wilaya: "16 - Alger" },
      telephone: "",
      email: user.email || "",
      siteWeb: "",
      regimeFiscal: "REGIME_REEL",
      assujettissementTva: true,
      tauxTvaApplicable: "TVA_19",
      periodiciteDeclaration: "MENSUEL",
      activiteNAP: "",
      secteurActivite: "SERVICES",
      centreImpots: "",
      exerciceFiscal: {
        debut: new Date(new Date().getFullYear(), 0, 1).toISOString(),
        fin: new Date(new Date().getFullYear(), 11, 31).toISOString()
      },
      effectif: 0,
      plan: "GRATUIT",
      subscription: {
        statut: "ESSAI",
        dateDebut: new Date().toISOString(),
        dateExpiration: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      addOns: [],
      efatura: { active: false, prefixeFacture: "FAC-", dernierNumero: 0 },
      members: { [user.uid]: 'owner' },
      userIds: [user.uid],
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      await setDoc(newTenantRef, tenantData);
      toast({ title: "Dossier créé", description: "Le nouveau dossier fiscal a été configuré avec succès." });
    } catch (e) {
      console.error(e);
    }
  };

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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={createDefaultTenant} className="cursor-pointer text-primary">
                  <Plus className="mr-2 h-4 w-4" /> Nouveau dossier fiscal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Menu</SidebarGroupLabel>
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
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Livres Légaux (SCF)</SidebarGroupLabel>
          <SidebarMenu>
            {legalBooks.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name} className="hover:bg-sidebar-accent">
                  <Link href={item.href}><item.icon /><span>{item.name}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px] font-bold">Gestion</SidebarGroupLabel>
          <SidebarMenu>
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
                      {user?.displayName || "Expert-Comptable"}
                    </span>
                    <span className="text-xs text-sidebar-foreground/70">Dossiers: {tenants?.length || 0}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer"><UserIcon className="h-4 w-4" /> Profil Expert</Link>
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
