
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  TrendingDown,
  ClipboardList,
  CalendarCheck,
  HardHat,
  Contact,
  Landmark,
  BookOpen,
  CalendarDays,
  Eye,
  GraduationCap,
  FileBadge,
  Scale,
  ShieldAlert,
  HandCoins,
  LifeBuoy,
  PlusCircle,
  Loader2,
  Package,
  ClipboardCheck,
  Boxes,
  ShoppingCart,
  Truck,
  CreditCard,
  FileSearch,
  Plus,
  Undo2,
  FileMinus,
  CircleDollarSign,
  Factory,
  Gavel,
  Pickaxe,
  Briefcase,
  FilePlus2,
  BarChart3,
  TrendingUp,
  HeartPulse,
  Zap,
  Target,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Layers,
  PieChart,
  Fuel,
  FlaskConical,
  Stethoscope,
  ChevronRight,
  Wrench
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase, useDoc, initiateAnonymousSignIn, setDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { toast } from "@/hooks/use-toast"

// Menu Pilotage (Commun)
const pilotageNav = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analyse & Pilotage", href: "/dashboard/financial-analysis", icon: BarChart3 },
]

// Menu Ventes
const salesNav = [
  { name: "Flux de Vente Hub", href: "/dashboard/sales", icon: CircleDollarSign },
  { name: "Commandes Clients", href: "/dashboard/sales/orders", icon: FileSearch },
  { name: "Livraisons (BL)", href: "/dashboard/sales/delivery", icon: Truck },
  { name: "Factures Émises", href: "/dashboard/sales/invoices", icon: Receipt },
]

// Menu Logistique (Transport)
const logisticsNav = [
  { name: "Pilotage Flotte", href: "/dashboard/logistics", icon: Truck },
  { name: "Consommation (Carburant)", href: "/dashboard/logistics/fuel", icon: Fuel },
  { name: "Carnet d'Entretien", href: "/dashboard/logistics/maintenance", icon: Wrench },
]

// Menu BTP
const btpNav = [
  { name: "Suivi Chantiers", href: "/dashboard/btp/projects", icon: Pickaxe },
  { name: "Situations de Travaux", href: "/dashboard/btp/situations", icon: FileBadge },
  { name: "Engins & Matériel", href: "/dashboard/accounting/assets", icon: HardHat },
]

// Menu Industrie
const industryNav = [
  { name: "Ordres de Fabrication", href: "/dashboard/industry/production", icon: Factory },
  { name: "Fiches Recettes", href: "/dashboard/industry/recipes", icon: ClipboardList },
]

// Menu Santé
const healthNav = [
  { name: "Traçabilité Lots", href: "/dashboard/health/lots", icon: FlaskConical },
  { name: "Dossiers Patient", icon: Stethoscope, href: "#" },
  { name: "Registre Psychotropes", icon: ShieldAlert, href: "#" },
]

// Menu Inventaire
const inventoryNav = [
  { name: "Catalogue Articles", href: "/dashboard/inventory/stock", icon: Boxes },
  { name: "Sessions d'Inventaire", href: "/dashboard/inventory", icon: ClipboardCheck },
  { name: "Registre des Actifs", href: "/dashboard/accounting/assets", icon: Package },
]

// Menu Achats
const purchaseNav = [
  { name: "Flux d'Achat Hub", href: "/dashboard/purchases", icon: ShoppingCart },
  { name: "Demandes d'Achat", href: "/dashboard/purchases/requests", icon: FilePlus2 },
  { name: "Factures Fournisseurs", href: "/dashboard/purchases/invoices", icon: Receipt },
]

// Menu Comptabilité
const accountingNav = [
  { name: "Saisie Journal", href: "/dashboard/accounting", icon: BookText },
  { name: "Grand Livre", href: "/dashboard/accounting/ledger", icon: Library },
  { name: "États Financiers", href: "/dashboard/accounting/financial-statements", icon: FileBarChart },
]

// Menu Analytique
const analyticNav = [
  { name: "Pilotage Analytique", href: "/dashboard/accounting/analytic/reporting", icon: PieChart },
  { name: "Architecture Analytique", href: "/dashboard/accounting/analytic/settings", icon: Layers },
]

const payrollNav = [
  { name: "Registre Personnel", href: "/dashboard/payroll", icon: Users },
  { name: "Audit & Conformité", href: "/dashboard/payroll/compliance", icon: ShieldCheck },
  { name: "Livre de Paie", href: "/dashboard/payroll/ledger", icon: BookOpen },
]

const fiscalNav = [
  { name: "Déclarations (G50/G12)", href: "/dashboard/declarations", icon: FileText },
  { name: "Liasse Fiscale (G4)", href: "/dashboard/declarations/g4", icon: FileText },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const [mounted, setMounted] = React.useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [newTenantData, setNewTenantData] = React.useState({
    raisonSociale: "",
    formeJuridique: "SARL",
    regimeFiscal: "REGIME_REEL",
    secteurActivite: "COMMERCE"
  })

  React.useEffect(() => {
    setMounted(true)
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);

  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord, isLoading: isAdminLoading } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

  const tenantIdFromUrl = searchParams.get('tenantId')

  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const handleTenantSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tenantId', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateTenant = async () => {
    if (!db || !user || !newTenantData.raisonSociale) return;
    setIsCreating(true);

    const tenantsColRef = collection(db, "tenants");
    const newTenantRef = doc(tenantsColRef);
    const tenantId = newTenantRef.id;

    const tenantData = {
      id: tenantId,
      ...newTenantData,
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      members: { [user.uid]: 'owner' },
      onboardingComplete: false,
      plan: 'GRATUIT',
      assujettissementTva: newTenantData.regimeFiscal === 'REGIME_REEL'
    };

    try {
      setDocumentNonBlocking(newTenantRef, tenantData, { merge: true });
      setIsCreateDialogOpen(false);
      handleTenantSelect(tenantId);
      toast({ 
        title: "Dossier initialisé", 
        description: `Le dossier ${newTenantData.raisonSociale} est prêt.` 
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur lors de la création" });
    } finally {
      setIsCreating(false);
    }
  };

  const NavGroup = ({ label, items, visible = true }: { label: string, items: any[], visible?: boolean }) => {
    if (!visible) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase tracking-[0.15em] text-[9px] font-black mt-2">
          {label}
        </SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item: any) => {
            const href = currentTenant ? `${item.href}?tenantId=${currentTenant.id}` : item.href
            const active = pathname === item.href;
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.name}>
                  <Link href={href}>
                    <item.icon className={active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary transition-colors"} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  if (!mounted) return null;

  const secteur = currentTenant?.secteurActivite || "COMMERCE";

  return (
    <>
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
                        {secteur}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-sidebar-foreground/30" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2 shadow-2xl rounded-xl">
                {tenants?.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => handleTenantSelect(t.id)} className="cursor-pointer rounded-lg mb-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase">{t.raisonSociale}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">NIF: {t.nif || 'N/A'}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsCreateDialogOpen(true); }} className="cursor-pointer font-bold text-primary text-xs flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Nouveau Dossier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label="Pilotage & Décision" items={pilotageNav} />
        
        <NavGroup label="Ventes & Clients" items={salesNav} visible={secteur === "COMMERCE" || secteur === "INDUSTRIE"} />
        <NavGroup label="Gestion Flotte" items={logisticsNav} visible={secteur === "TRANSPORT"} />
        <NavGroup label="Gestion Chantiers" items={btpNav} visible={secteur === "BTP"} />
        <NavGroup label="Production" items={industryNav} visible={secteur === "INDUSTRIE"} />
        <NavGroup label="Gestion Santé" items={healthNav} visible={secteur === "SANTE"} />

        <NavGroup label="Stocks & Patrimoine" items={inventoryNav} visible={secteur !== "SERVICES" && secteur !== "PRO_LIBERALE"} />

        <NavGroup label="Achats & Dépenses" items={purchaseNav} visible={secteur !== "PRO_LIBERALE"} />
        <NavGroup label="Comptabilité SCF" items={accountingNav} />
        <NavGroup label="Comptabilité Analytique" items={analyticNav} />
        <NavGroup label="RH & Paie" items={payrollNav} />
        <NavGroup label="Fiscalité & Sociaux" items={fiscalNav} />

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase tracking-[0.15em] text-[9px] font-black mt-2">Support & Config</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/support"} tooltip="Assistance">
                <Link href={currentTenant ? `/dashboard/support?tenantId=${currentTenant.id}` : "/dashboard/support"}>
                  <LifeBuoy /><span>Assistance & Support</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip="Paramètres">
                <Link href={currentTenant ? `/dashboard/settings?tenantId=${currentTenant.id}` : "/dashboard/settings"}>
                  <Settings /><span>Paramètres Dossier</span>
                </Link>
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
                      {user?.displayName || user?.email?.split('@')[0] || "Mon Compte"}
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

    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Créer un nouveau dossier</DialogTitle>
          <DialogDescription>Configurez les paramètres de base et le profil métier.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="raisonSociale">Raison Sociale</Label>
            <Input id="raisonSociale" placeholder="Ex: SARL Ma Nouvelle Entreprise" value={newTenantData.raisonSociale} onChange={e => setNewTenantData({...newTenantData, raisonSociale: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Forme Juridique</Label>
              <Select value={newTenantData.formeJuridique} onValueChange={v => setNewTenantData({...newTenantData, formeJuridique: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["SARL", "SPA", "EURL", "SNC", "EI", "Auto-entrepreneur"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Régime Fiscal</Label>
              <Select value={newTenantData.regimeFiscal} onValueChange={v => setNewTenantData({...newTenantData, regimeFiscal: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IFU">IFU (Forfaitaire)</SelectItem>
                  <SelectItem value="REGIME_REEL">Régime du Réel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Secteur Stratégique</Label>
            <Select value={newTenantData.secteurActivite} onValueChange={v => setNewTenantData({...newTenantData, secteurActivite: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMMERCE">🛒 Commerce & Négoce</SelectItem>
                <SelectItem value="BTP">🏗 BTPH (Chantiers)</SelectItem>
                <SelectItem value="TRANSPORT">🚚 Transport & Logistique</SelectItem>
                <SelectItem value="INDUSTRIE">🏭 Agroalimentaire / Industrie</SelectItem>
                <SelectItem value="SANTE">🏥 Santé (Pharmacie/Clinique)</SelectItem>
                <SelectItem value="PRO_LIBERALE">👨‍⚖️ Profession Libérale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateTenant} disabled={isCreating || !newTenantData.raisonSociale} className="w-full">
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Initialiser le Dossier {newTenantData.secteurActivite}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
