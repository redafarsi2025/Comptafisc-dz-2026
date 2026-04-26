
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
  Plus,
  Loader2,
  LifeBuoy,
  Boxes,
  ClipboardCheck,
  FileSearch,
  FilePlus2,
  BookOpen,
  Target,
  FileBadge,
  Package,
  ChevronRight
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
import { cn } from "@/lib/utils"

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
  const isRtl = locale === 'ar';

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
      toast({ title: t.Common.new_dossier, description: `${newTenantData.raisonSociale} ok.` });
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
                    <item.icon className={cn(
                      "transition-all duration-300", 
                      active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary",
                      isRtl && "rotate-0" 
                    )} />
                    <span className="font-bold text-xs uppercase tracking-tight">{item.name}</span>
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

  // Navigation Items
  const pilotageNav = [
    { name: t.Navigation.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { name: t.Navigation.analytics, href: "/dashboard/financial-analysis", icon: BarChart3 },
  ]
  const relationsNav = [
    { name: t.Navigation.contacts, href: "/dashboard/contacts", icon: Users },
    { name: t.Navigation.crm, href: "/dashboard/crm", icon: Target },
  ]
  const salesNav = [
    { name: t.Navigation.invoicing, href: "/dashboard/invoicing", icon: FilePlus },
    { name: t.Navigation.sales_hub, href: "/dashboard/sales", icon: CircleDollarSign },
    { name: t.Navigation.orders, href: "/dashboard/sales/orders", icon: FileSearch },
    { name: t.Navigation.delivery, href: "/dashboard/sales/delivery", icon: Truck },
    { name: t.Navigation.invoices, href: "/dashboard/sales/invoices", icon: Receipt },
  ]
  const logisticsNav = [
    { name: t.Navigation.logistics, href: "/dashboard/logistics", icon: Truck },
    { name: t.Navigation.fuel, href: "/dashboard/logistics/fuel", icon: Fuel },
    { name: t.Navigation.maintenance, href: "/dashboard/logistics/maintenance", icon: Wrench },
  ]
  const btpNav = [
    { name: t.Navigation.projects, href: "/dashboard/btp/projects", icon: Pickaxe },
    { name: t.Navigation.situations, href: "/dashboard/btp/situations", icon: FileBadge },
  ]
  const industryNav = [
    { name: t.Navigation.production, href: "/dashboard/industry/production", icon: Factory },
    { name: t.Navigation.recipes, href: "/dashboard/industry/recipes", icon: FileText },
  ]
  const healthNav = [
    { name: t.Navigation.health_lots, href: "/dashboard/health/lots", icon: FlaskConical },
  ]
  const inventoryNav = [
    { name: t.Navigation.inventory_stock, href: "/dashboard/inventory/stock", icon: Boxes },
    { name: t.Navigation.inventory_sessions, href: "/dashboard/inventory", icon: ClipboardCheck },
    { name: t.Navigation.assets, href: "/dashboard/accounting/assets", icon: Package },
  ]
  const purchaseNav = [
    { name: t.Navigation.purchase_hub, href: "/dashboard/purchases", icon: ShoppingCart },
    { name: t.Navigation.purchase_requests, href: "/dashboard/purchases/requests", icon: FilePlus2 },
    { name: t.Navigation.invoices, href: "/dashboard/purchases/invoices", icon: Receipt },
  ]
  const accountingNav = [
    { name: t.Navigation.journal, href: "/dashboard/accounting", icon: BookText },
    { name: t.Navigation.ledger, href: "/dashboard/accounting/ledger", icon: Library },
    { name: t.Navigation.financial_statements, href: "/dashboard/accounting/financial-statements", icon: FileBarChart },
  ]
  const analyticNav = [
    { name: t.Navigation.analytic_reporting, href: "/dashboard/accounting/analytic/reporting", icon: PieChart },
    { name: t.Navigation.analytic_settings, href: "/dashboard/accounting/analytic/settings", icon: Layers },
  ]
  const payrollNav = [
    { name: t.Navigation.payroll_register, href: "/dashboard/payroll", icon: Users },
    { name: t.Navigation.payroll_compliance, href: "/dashboard/payroll/compliance", icon: ShieldCheck },
    { name: t.Navigation.payroll_ledger, href: "/dashboard/payroll/ledger", icon: BookOpen },
  ]
  const fiscalNav = [
    { name: t.Navigation.declarations, href: "/dashboard/declarations", icon: FileText },
    { name: t.Navigation.etat104, href: "/dashboard/declarations/etat104", icon: TableProperties },
    { name: t.Navigation.liasse_g4, href: "/dashboard/declarations/g4", icon: FileText },
  ]

  return (
    <>
    <Sidebar side={isRtl ? "right" : "left"} variant="sidebar" collapsible="icon" className={cn("border-sidebar-border/50", isRtl ? "border-l" : "border-r")}>
      <SidebarHeader className="bg-sidebar p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent transition-all duration-200 border border-transparent hover:border-sidebar-border">
                  <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 shrink-0">
                    <Building2 className="size-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none ms-2 me-2">
                    <span className="font-black text-sm text-sidebar-foreground truncate w-32 uppercase tracking-tighter">
                      {isTenantsLoading ? "..." : (currentTenant?.raisonSociale || "---")}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-black text-sidebar-foreground/50 uppercase tracking-widest">
                        {secteur}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={cn("size-4 text-sidebar-foreground/30", isRtl ? "me-auto" : "ms-auto")} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "end" : "start"} className="w-72 p-2 shadow-2xl rounded-xl">
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
                  <PlusCircle className="h-4 w-4" /> {t.Common.new_dossier}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label={isRtl ? "التوجيه والقرار" : t.Navigation.global_ops} items={pilotageNav} />
        <NavGroup label={isRtl ? "العلاقات" : "Relations & CRM"} items={relationsNav} />
        
        <NavGroup label={isRtl ? "المبيعات" : "Ventes & Clients"} items={salesNav} visible={secteur === "COMMERCE" || secteur === "INDUSTRIE" || secteur === "TRANSPORT"} />
        <NavGroup label={isRtl ? "اللوجستيك" : "Gestion Flotte"} items={logisticsNav} visible={secteur === "TRANSPORT"} />
        <NavGroup label={isRtl ? "الأشغال" : "Gestion Chantiers"} items={btpNav} visible={secteur === "BTP"} />
        <NavGroup label={isRtl ? "التصنيع" : "Production"} items={industryNav} visible={secteur === "INDUSTRIE"} />
        <NavGroup label={isRtl ? "الصحة" : "Gestion Santé"} items={healthNav} visible={secteur === "SANTE"} />

        <NavGroup label={isRtl ? "المخزون" : "Stocks & Patrimoine"} items={inventoryNav} visible={secteur !== "SERVICES" && secteur !== "PRO_LIBERALE"} />

        <NavGroup label={isRtl ? "المشتريات" : "Achats & Dépenses"} items={purchaseNav} visible={secteur !== "PRO_LIBERALE"} />
        <NavGroup label={isRtl ? "المحاسبة" : "Comptabilité SCF"} items={accountingNav} />
        <NavGroup label={isRtl ? "التحليل" : "Comptabilité Analytique"} items={analyticNav} />
        <NavGroup label={isRtl ? "الموارد البشرية" : "RH & Paie"} items={payrollNav} />
        <NavGroup label={isRtl ? "الضرائب" : "Fiscalité & Sociaux"} items={fiscalNav} />

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase tracking-[0.15em] text-[9px] font-black mt-2">{t.Navigation.config_section}</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/support"} tooltip={t.Navigation.support}>
                <Link href={currentTenant ? `/dashboard/support?tenantId=${currentTenant.id}` : "/dashboard/support"}>
                  <LifeBuoy /><span>{t.Navigation.support}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip={t.Navigation.settings}>
                <Link href={currentTenant ? `/dashboard/settings?tenantId=${currentTenant.id}` : "/dashboard/settings"}>
                  <Settings /><span>{t.Navigation.settings}</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
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
                  <div className="flex flex-col gap-0.5 text-left text-sm leading-tight ms-2 me-2">
                    <span className="font-bold text-sidebar-foreground truncate w-32">
                      {user?.displayName || user?.email?.split('@')[0] || "Mon Compte"}
                    </span>
                    <span className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-tighter">{isRtl ? "خبير محاسب" : "Expert-Comptable"}</span>
                  </div>
                  <ChevronDown className={cn("size-4 text-sidebar-foreground/30", isRtl ? "me-auto" : "ms-auto")} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align={isRtl ? "start" : "end"} className="w-64 p-2 shadow-2xl rounded-xl">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer font-medium text-sm py-2"><UserIcon className="h-4 w-4" /> {t.Common.profile}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive font-bold text-sm py-2"><LogOut className="h-4 w-4" /> {t.Common.logout}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t.Common.new_dossier}</DialogTitle>
          <DialogDescription>{isRtl ? "تكوين المعلمات الأساسية والملف المهني." : "Configurez les paramètres de base et le profil métier."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="raisonSociale" className="text-start">{isRtl ? "اسم الشركة" : "Raison Sociale"}</Label>
            <Input id="raisonSociale" placeholder="SARL ..." value={newTenantData.raisonSociale} onChange={e => setNewTenantData({...newTenantData, raisonSociale: e.target.value})} className="text-start" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateTenant} disabled={isCreating} className="w-full font-bold">
            {isCreating ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <Plus className="ms-2 h-4 w-4" />}
            {t.Common.new_dossier}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
