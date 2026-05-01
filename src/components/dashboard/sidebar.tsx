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
  ClipboardList,
  FileSearch,
  FilePlus2,
  BookOpen,
  Target,
  FileBadge,
  Package,
  ChevronRight,
  Landmark,
  MessagesSquare,
  Repeat,
  ArrowRightLeft,
  Crown,
  Anchor,
  Zap,
  Bot,
  Sparkles,
  ShieldAlert
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
import { Badge } from "@/components/ui/badge"
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

  const activeAddons = currentTenant?.activeAddons || [];
  
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
      members: { [user.uid]: { role: 'owner' } }, // Correction: role doit être un objet
      onboardingComplete: false,
      plan: 'GRATUIT',
      activeAddons: [],
      assujettissementTva: newTenantData.regimeFiscal === 'REGIME_REEL'
    };

    try {
      await setDoc(newTenantRef, tenantData);
      setIsCreateDialogOpen(false);
      // Redirection vers la page de configuration, qui est plus sûre pour un nouveau dossier
      router.push(`/dashboard/settings?tenantId=${tenantId}`);
      toast({ title: t.Common.new_dossier, description: `${newTenantData.raisonSociale} a été créé.` });
    } catch (e) {
      console.error("Erreur de création de dossier:", e);
      toast({ title: "Erreur", description: "La création du dossier a échoué.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const NavGroup = ({ label, items, visible = true }: { label: string, items: any[], visible?: boolean }) => {
    if (!visible) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-slate-400 uppercase tracking-[0.2em] text-[8px] font-black mt-4 mb-2 px-4">
          {label}
        </SidebarGroupLabel>
        <SidebarMenu className="gap-0.5">
          {items.map((item: any) => {
            if (item.requireAddon && !activeAddons.includes(item.requireAddon) && currentTenant?.plan !== 'PRO') return null;
            const href = currentTenant ? `${item.href}?tenantId=${currentTenant.id}` : item.href
            const active = pathname === item.href;
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={active} 
                  tooltip={item.name}
                  className={cn(
                    "rounded-xl h-10 transition-all duration-200 border border-transparent",
                    active ? "bg-primary/10 text-primary border-primary/10 shadow-sm" : "hover:bg-slate-50 text-slate-600 hover:text-primary"
                  )}
                >
                  <Link href={href} className="flex items-center gap-3 w-full px-4">
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-slate-400 group-hover:text-primary")} />
                    <span className="font-bold text-[11px] uppercase tracking-tight truncate flex-1">{item.name}</span>
                    {item.isPremium && <Badge className="bg-accent text-[7px] font-black h-4 px-1.5 uppercase">Premium</Badge>}
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
  const isCabinetPlan = currentTenant?.plan === "CABINET";
  const userRole = currentTenant?.members?.[user?.uid]?.role;
  const isCabinetMember = userRole === 'owner' || userRole === 'admin';

  const cabinetNav = [
    { name: t.Navigation.cabinet_dashboard, href: "/dashboard/cabinet", icon: Target },
  ]
  const pilotageNav = [
    { name: t.Navigation.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { name: t.Navigation.analytics, href: "/dashboard/financial-analysis", icon: BarChart3 },
    { name: "Coach Stratégique", href: "/dashboard/assistant", icon: Bot, requireAddon: 'SEAD_STRATEGIC', isPremium: true },
  ]
  const customsNav = [
    { name: t.Customs.customs_hub, href: "/dashboard/customs", icon: Anchor },
  ]
  const salesNav = [
    { name: t.Navigation.sales_hub, href: "/dashboard/sales", icon: CircleDollarSign },
    { name: t.Navigation.invoices, href: "/dashboard/sales/invoices", icon: Receipt },
  ]
  const logisticsNav = [
    { name: t.Navigation.logistics, href: "/dashboard/logistics", icon: Truck },
  ]
  const btpNav = [
    { name: t.Navigation.projects, href: "/dashboard/btp/projects", icon: Pickaxe },
  ]
  const industryNav = [
    { name: t.Navigation.production, href: "/dashboard/industry/production", icon: Factory },
  ]
  const inventoryNav = [
    { name: t.Navigation.inventory_stock, href: "/dashboard/inventory/stock", icon: Boxes },
    { name: t.Navigation.assets, href: "/dashboard/accounting/assets", icon: Package },
  ]
  const purchaseNav = [
    { name: t.Navigation.purchase_hub, href: "/dashboard/purchases", icon: ShoppingCart },
    { name: "Capture Vision IA", href: "/dashboard/ocr", icon: Sparkles, isPremium: true },
  ]
  const accountingNav = [
    { name: t.Navigation.journal, href: "/dashboard/accounting", icon: BookText },
    { name: "Plan Comptable (PCE)", href: "/dashboard/accounting/chart", icon: Library },
  ]
  const analyticNav = [
    { name: t.Navigation.analytic_reporting, href: "/dashboard/accounting/analytic/reporting", icon: PieChart },
    { name: t.Navigation.analytic_settings, href: "/dashboard/accounting/analytic/settings", icon: Layers },
  ]
  const payrollNav = [
    { name: t.Navigation.payroll_register, href: "/dashboard/payroll", icon: Users },
  ]
  const fiscalNav = [
    { name: t.Navigation.declarations, href: "/dashboard/declarations", icon: FileText },
  ]

  return (
    <>
    <Sidebar side={isRtl ? "right" : "left"} variant="sidebar" collapsible="icon" className={cn("border-sidebar-border/50 bg-white", isRtl ? "border-l" : "border-r shadow-sm")}>
      <SidebarHeader className="p-4 bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-slate-50 transition-all duration-300 border border-transparent hover:border-slate-100 rounded-2xl h-14">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 shrink-0">
                    <Building2 className="size-6" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none ms-3 me-3 overflow-hidden text-start">
                    <span className="font-black text-sm text-slate-900 truncate uppercase tracking-tighter">
                      {isTenantsLoading ? "..." : (currentTenant?.raisonSociale || t.Common.select_dossier)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {currentTenant && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {currentTenant ? secteur : t.Common.no_folder}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={cn("size-4 text-slate-300", isRtl ? "me-auto" : "ms-auto")} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "end" : "start"} className="w-72 p-2 shadow-2xl rounded-2xl border-slate-100">
                <div className="px-2 py-1.5 text-sm font-semibold text-[10px] font-black text-slate-400 uppercase px-4 py-3 tracking-[0.2em]">{t.Common.accessible_folders}</div>
                {tenants?.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => handleTenantSelect(t.id)} className="cursor-pointer rounded-xl mb-1 p-3 hover:bg-primary/5">
                    <div className="flex flex-col">
                      <span className="font-black text-xs uppercase text-slate-900">{t.raisonSociale}</span>
                      <span className="text-[9px] text-slate-400 font-mono font-bold mt-1">NIF: {t.nif || 'N/A'}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsCreateDialogOpen(true); }} className="cursor-pointer font-black text-primary text-[10px] uppercase tracking-widest flex items-center gap-2 p-3 hover:bg-primary/5 rounded-xl">
                  <PlusCircle className="h-4 w-4" /> {t.Common.new_dossier}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 custom-scrollbar bg-white">
        {isCabinetMember && <NavGroup label="Expert Cabinet Hub" items={cabinetNav} />}
        <NavGroup label={t.Navigation.global_ops} items={pilotageNav} />
        <NavGroup label="Commerce Extérieur" items={customsNav} visible={secteur === "COMMERCE" || secteur === "INDUSTRIE"} />
        <NavGroup label="Ventes & Clients" items={salesNav} visible={secteur === "COMMERCE" || secteur === "INDUSTRIE" || secteur === "TRANSPORT"} />
        <NavGroup label="Gestion Flotte" items={logisticsNav} visible={secteur !== "PRO_LIBERALE"} />
        <NavGroup label="Gestion Chantiers" items={btpNav} visible={secteur === "BTP"} />
        <NavGroup label="Production Industrielle" items={industryNav} visible={secteur === "INDUSTRIE"} />
        <NavGroup label="Stocks & Patrimoine" items={inventoryNav} visible={secteur !== "SERVICES" && secteur !== "PRO_LIBERALE"} />
        <NavGroup label="Achats & Dépenses" items={purchaseNav} visible={secteur !== "PRO_LIBERALE"} />
        <NavGroup label="Comptabilité SCF" items={accountingNav} />
        <NavGroup label="Comptabilité Analytique" items={analyticNav} />
        <NavGroup label="RH & Paie" items={payrollNav} />
        <NavGroup label="Fiscalité & Sociaux" items={fiscalNav} />

        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 uppercase tracking-[0.2em] text-[8px] font-black mt-6 mb-2 px-4">{t.Navigation.config_section}</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/support"} tooltip={t.Navigation.support} className="rounded-xl h-10 font-bold text-xs uppercase text-slate-600 hover:text-primary transition-all px-4">
                <Link href={currentTenant ? `/dashboard/support?tenantId=${currentTenant.id}` : "/dashboard/support"} className="flex items-center gap-3">
                  <LifeBuoy className="h-4 w-4" /><span>{t.Navigation.support}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip={t.Navigation.settings} className="rounded-xl h-10 font-bold text-xs uppercase text-slate-600 hover:text-primary transition-all px-4">
                <Link href={currentTenant ? `/dashboard/settings?tenantId=${currentTenant.id}` : "/dashboard/settings"} className="flex items-center gap-3">
                  <Settings className="h-4 w-4" /><span>{t.Navigation.settings}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-4 bg-slate-50/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl h-14 transition-all">
                  <Avatar className="h-10 w-10 rounded-xl border-2 border-white shadow-sm shrink-0">
                    <AvatarImage src={`https://picsum.photos/seed/${user?.uid || 'user'}/40/40`} />
                    <AvatarFallback className="rounded-xl bg-slate-200 text-slate-600 font-black">DZ</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 text-left text-sm leading-tight ms-3 me-3 overflow-hidden">
                    <span className="font-black text-slate-900 truncate w-32 uppercase tracking-tighter">
                      {user?.displayName || user?.email?.split('@')[0] || "Mon Compte"}
                    </span>
                    <span className={cn("font-bold text-slate-400 uppercase tracking-widest", isRtl ? "text-[12px]" : "text-[8px]")}>
                      {isRtl ? "خبير محاسب" : "Expert-Comptable"}
                    </span>
                  </div>
                  <ChevronDown className={cn("size-4 text-slate-300", isRtl ? "me-auto" : "ms-auto")} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align={isRtl ? "start" : "end"} className="w-64 p-2 shadow-2xl rounded-2xl border-slate-100 mb-2">
                <DropdownMenuItem asChild className="p-3 rounded-xl cursor-pointer hover:bg-primary/5">
                  <Link href="/dashboard/profile" className="flex items-center gap-3 font-bold text-xs uppercase tracking-tight text-slate-700">
                    <UserIcon className="h-4 w-4 text-primary" /> {t.Common.profile}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 cursor-pointer text-red-600 font-black text-xs uppercase tracking-widest p-3 rounded-xl hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> {t.Common.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} dir={isRtl ? 'rtl' : 'ltr'} className="rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter">{t.Common.new_dossier}</DialogTitle>
          <DialogDescription className="text-xs font-medium">{isRtl ? "تكوين المعلمات الأساسية والملف المهني." : "Configurez les paramètres de base et le profil métier."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="raisonSociale" className="text-[10px] font-black uppercase text-slate-400 px-1">{isRtl ? "اسم الشركة" : "Raison Sociale"}</Label>
            <Input id="raisonSociale" placeholder="SARL ..." value={newTenantData.raisonSociale} onChange={e => setNewTenantData({...newTenantData, raisonSociale: e.target.value})} className="h-12 rounded-xl text-start font-bold" />
          </div>
        </div>
        <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t rounded-b-3xl">
          <Button onClick={handleCreateTenant} disabled={isCreating} className="w-full h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
            {isCreating ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <Plus className="ms-2 h-4 w-4" />}
            {t.Common.new_dossier}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
