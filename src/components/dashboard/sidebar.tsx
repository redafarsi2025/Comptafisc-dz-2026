
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
  Settings,
  ChevronDown,
  Building2,
  User as UserIcon,
  LogOut,
  Library,
  FileBarChart,
  ShoppingCart,
  Truck,
  CircleDollarSign,
  Factory,
  Pickaxe,
  BarChart3,
  Calculator,
  ShieldCheck,
  Layers,
  PieChart,
  Fuel,
  FlaskConical,
  Wrench,
  FilePlus,
  TableProperties,
  PlusCircle,
  Loader2,
  LifeBuoy,
  Boxes,
  ClipboardCheck,
  FileSearch,
  FilePlus2,
  BookOpen,
  Target,
  FileBadge,
  Package
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
import { Locale, TRANSLATIONS } from "@/lib/translations"

export function DashboardSidebar({ locale = 'fr' }: { locale?: Locale }) {
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

  const t = TRANSLATIONS[locale];

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);

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
      toast({ title: t.new_dossier, description: `${newTenantData.raisonSociale} ok.` });
    } catch (e) {
      console.error(e);
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

  // Navigation Items translated
  const pilotageNav = [
    { name: t.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { name: t.analytics, href: "/dashboard/financial-analysis", icon: BarChart3 },
  ]
  const relationsNav = [
    { name: t.contacts, href: "/dashboard/contacts", icon: Users },
    { name: t.crm, href: "/dashboard/crm", icon: Target },
  ]
  const salesNav = [
    { name: t.invoicing, href: "/dashboard/invoicing", icon: FilePlus },
    { name: t.sales_hub, href: "/dashboard/sales", icon: CircleDollarSign },
    { name: t.orders, href: "/dashboard/sales/orders", icon: FileSearch },
    { name: t.delivery, href: "/dashboard/sales/delivery", icon: Truck },
    { name: t.invoices, href: "/dashboard/sales/invoices", icon: Receipt },
  ]
  const logisticsNav = [
    { name: t.logistics, href: "/dashboard/logistics", icon: Truck },
    { name: t.fuel, href: "/dashboard/logistics/fuel", icon: Fuel },
    { name: t.maintenance, href: "/dashboard/logistics/maintenance", icon: Wrench },
  ]
  const btpNav = [
    { name: t.projects, href: "/dashboard/btp/projects", icon: Pickaxe },
    { name: t.situations, href: "/dashboard/btp/situations", icon: FileBadge },
  ]
  const industryNav = [
    { name: t.production, href: "/dashboard/industry/production", icon: Factory },
    { name: t.recipes, href: "/dashboard/industry/recipes", icon: FileText },
  ]
  const healthNav = [
    { name: t.health_lots, href: "/dashboard/health/lots", icon: FlaskConical },
  ]
  const inventoryNav = [
    { name: t.inventory_stock, href: "/dashboard/inventory/stock", icon: Boxes },
    { name: t.inventory_sessions, href: "/dashboard/inventory", icon: ClipboardCheck },
    { name: t.assets, href: "/dashboard/accounting/assets", icon: Package },
  ]
  const purchaseNav = [
    { name: t.purchase_hub, href: "/dashboard/purchases", icon: ShoppingCart },
    { name: t.purchase_requests, href: "/dashboard/purchases/requests", icon: FilePlus2 },
    { name: t.invoices, href: "/dashboard/purchases/invoices", icon: Receipt },
  ]
  const accountingNav = [
    { name: t.journal, href: "/dashboard/accounting", icon: BookText },
    { name: t.ledger, href: "/dashboard/accounting/ledger", icon: Library },
    { name: t.financial_statements, href: "/dashboard/accounting/financial-statements", icon: FileBarChart },
  ]
  const analyticNav = [
    { name: t.analytic_reporting, href: "/dashboard/accounting/analytic/reporting", icon: PieChart },
    { name: t.analytic_settings, href: "/dashboard/accounting/analytic/settings", icon: Layers },
  ]
  const payrollNav = [
    { name: t.payroll_register, href: "/dashboard/payroll", icon: Users },
    { name: t.payroll_compliance, href: "/dashboard/payroll/compliance", icon: ShieldCheck },
    { name: t.payroll_ledger, href: "/dashboard/payroll/ledger", icon: BookOpen },
  ]
  const fiscalNav = [
    { name: t.declarations, href: "/dashboard/declarations", icon: FileText },
    { name: t.etat104, href: "/dashboard/declarations/etat104", icon: TableProperties },
    { name: t.liasse_g4, href: "/dashboard/declarations/g4", icon: FileText },
  ]

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
                  <div className={`flex flex-col gap-0.5 leading-none ${locale === 'ar' ? 'mr-2' : 'ml-2'}`}>
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
                  <ChevronDown className={`${locale === 'ar' ? 'mr-auto' : 'ml-auto'} size-4 text-sidebar-foreground/30`} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={locale === 'ar' ? "end" : "start"} className="w-72 p-2 shadow-2xl rounded-xl">
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
                  <PlusCircle className="h-4 w-4" /> {t.new_dossier}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label={locale === 'ar' ? "التوجيه والقرار" : "Pilotage & Décision"} items={pilotageNav} />
        <NavGroup label={locale === 'ar' ? "العلاقات" : "Relations & CRM"} items={relationsNav} />
        
        <NavGroup label={locale === 'ar' ? "المبيعات" : "Ventes & Clients"} items={salesNav} visible={secteur === "COMMERCE" || secteur === "INDUSTRIE" || secteur === "TRANSPORT"} />
        <NavGroup label={locale === 'ar' ? "اللوجستيك" : "Gestion Flotte"} items={logisticsNav} visible={secteur === "TRANSPORT"} />
        <NavGroup label={locale === 'ar' ? "الأشغال" : "Gestion Chantiers"} items={btpNav} visible={secteur === "BTP"} />
        <NavGroup label={locale === 'ar' ? "التصنيع" : "Production"} items={industryNav} visible={secteur === "INDUSTRIE"} />
        <NavGroup label={locale === 'ar' ? "الصحة" : "Gestion Santé"} items={healthNav} visible={secteur === "SANTE"} />

        <NavGroup label={locale === 'ar' ? "المخزون" : "Stocks & Patrimoine"} items={inventoryNav} visible={secteur !== "SERVICES" && secteur !== "PRO_LIBERALE"} />

        <NavGroup label={locale === 'ar' ? "المشتريات" : "Achats & Dépenses"} items={purchaseNav} visible={secteur !== "PRO_LIBERALE"} />
        <NavGroup label={locale === 'ar' ? "المحاسبة" : "Comptabilité SCF"} items={accountingNav} />
        <NavGroup label={locale === 'ar' ? "التحليل" : "Comptabilité Analytique"} items={analyticNav} />
        <NavGroup label={locale === 'ar' ? "الموارد البشرية" : "RH & Paie"} items={payrollNav} />
        <NavGroup label={locale === 'ar' ? "الضرائب" : "Fiscalité & Sociaux"} items={fiscalNav} />

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase tracking-[0.15em] text-[9px] font-black mt-2">{locale === 'ar' ? "الدعم والإعدادات" : "Support & Config"}</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/support"} tooltip={t.support}>
                <Link href={currentTenant ? `/dashboard/support?tenantId=${currentTenant.id}` : "/dashboard/support"}>
                  <LifeBuoy /><span>{t.support}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip={t.settings}>
                <Link href={currentTenant ? `/dashboard/settings?tenantId=${currentTenant.id}` : "/dashboard/settings"}>
                  <Settings /><span>{t.settings}</span>
                </Link>
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
                  <div className={`flex flex-col gap-0.5 text-left text-sm leading-tight ${locale === 'ar' ? 'mr-2' : 'ml-2'}`}>
                    <span className="font-bold text-sidebar-foreground truncate w-32">
                      {user?.displayName || user?.email?.split('@')[0] || "Mon Compte"}
                    </span>
                    <span className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-tighter">{locale === 'ar' ? "خبير محاسب" : "Expert-Comptable"}</span>
                  </div>
                  <ChevronDown className={`${locale === 'ar' ? 'mr-auto' : 'ml-auto'} size-4 text-sidebar-foreground/30`} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align={locale === 'ar' ? "start" : "end"} className="w-64 p-2 shadow-2xl rounded-xl">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer font-medium text-sm py-2"><UserIcon className="h-4 w-4" /> {t.profile}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive font-bold text-sm py-2"><LogOut className="h-4 w-4" /> {t.logout}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t.new_dossier}</DialogTitle>
          <DialogDescription>{locale === 'ar' ? "تكوين المعلمات الأساسية والملف المهني." : "Configurez les paramètres de base et le profil métier."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2 text-right">
            <Label htmlFor="raisonSociale">{locale === 'ar' ? "اسم الشركة" : "Raison Sociale"}</Label>
            <Input id="raisonSociale" placeholder="SARL ..." value={newTenantData.raisonSociale} onChange={e => setNewTenantData({...newTenantData, raisonSociale: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateTenant} disabled={isCreating} className="w-full">
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {t.new_dossier}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
