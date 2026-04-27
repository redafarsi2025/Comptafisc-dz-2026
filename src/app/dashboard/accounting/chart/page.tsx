
/**
 * @fileOverview Gestion du Plan Comptable de l'Entité (PCE).
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Library, Plus, Search, Loader2, 
  ShieldCheck, Sparkles, DatabaseZap,
  Landmark, ChevronRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { initializeClientChartOfAccounts } from "@/services/accounting/chart-of-accounts.service"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useLocale } from "@/context/LocaleContext"

export default function ChartOfAccountsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { locale, isRtl } = useLocale()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isInitializing, setIsInitializing] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  // Profil du Tenant pour connaître le secteur
  const tenantRef = useMemoFirebase(() => (db && tenantId) ? doc(db, "tenants", tenantId) : null, [db, tenantId]);
  const { data: tenant } = useDoc(tenantRef);

  // Plan comptable réel du client
  const accountsQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "accounts"), orderBy("accountNumber", "asc")) : null
  , [db, tenantId]);
  const { data: accounts, isLoading } = useCollection(accountsQuery);

  const filteredAccounts = React.useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(a => 
      a.accountNumber.includes(searchTerm) || 
      a.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.labelAr && a.labelAr.includes(searchTerm))
    );
  }, [accounts, searchTerm]);

  const handleInitialize = async () => {
    if (!db || !tenantId || !tenant?.secteurActivite) return;
    setIsInitializing(true);
    try {
      const count = await initializeClientChartOfAccounts(db, tenantId, tenant.secteurActivite);
      toast({ title: "Plan activé", description: `${count} comptes SCF initialisés pour le secteur ${tenant.secteurActivite}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsInitializing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Library className="text-accent h-8 w-8" /> Plan Comptable (PCE)
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Nomenclature personnalisée conforme au SCF algérien</p>
        </div>
        <div className="flex gap-2">
          {accounts?.length === 0 && !isLoading && (
            <Button 
              onClick={handleInitialize} 
              disabled={isInitializing}
              className="bg-accent text-primary font-black uppercase text-[10px] tracking-widest h-11 px-8 rounded-2xl shadow-lg"
            >
              {isInitializing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Initialiser Pack {tenant?.secteurActivite || "SERVICES"}
            </Button>
          )}
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
            <Plus className="mr-2 h-4 w-4" /> Nouveau Compte
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Comptes Indexés</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-primary tracking-tighter">{accounts?.length || 0}</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Standards SCF</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-emerald-600 tracking-tighter">{accounts?.filter(a => !a.isCustom).length || 0}</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Personnalisés</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-amber-600">{accounts?.filter(a => a.isCustom).length || 0}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center px-6">
          <ShieldCheck className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
          <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 relative">Statut Moteur</p>
          <div className="text-lg font-black text-white relative uppercase">VALIDÉ 2026</div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-6 px-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tighter">Répertoire des Comptes</CardTitle>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Chercher numéro ou libellé..." 
              className="pl-9 h-10 w-80 rounded-xl bg-white text-xs shadow-sm" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[9px] uppercase font-black px-6 border-b h-12">
                <TableHead className="ps-8">Numéro de Compte</TableHead>
                <TableHead>Libellé SCF (Bilingue)</TableHead>
                <TableHead>Type de Solde</TableHead>
                <TableHead className="text-center">Origine</TableHead>
                <TableHead className="text-right pe-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : accounts?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic text-xs uppercase font-black">
                  Aucun compte. Veuillez initialiser votre pack métier.
                </TableCell></TableRow>
              ) : filteredAccounts.map((acc) => (
                <TableRow key={acc.id} className="hover:bg-muted/5 group transition-colors h-16">
                  <TableCell className="ps-8 font-mono text-sm font-black text-primary">{acc.accountNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase text-slate-900">{acc.label}</span>
                      {acc.labelAr && <span className="text-[10px] text-slate-400 font-bold" dir="rtl">{acc.labelAr}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "text-[8px] font-black uppercase h-5",
                      acc.type === 'ACTIF' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                      acc.type === 'PASSIF' ? 'border-purple-200 text-purple-700 bg-purple-50' :
                      acc.type === 'CHARGE' ? 'border-red-200 text-red-700 bg-red-50' :
                      'border-emerald-200 text-emerald-700 bg-emerald-50'
                    )}>
                      {acc.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {acc.isCustom ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px] font-black h-5 uppercase">Custom</Badge>
                    ) : (
                      <Badge className="bg-primary/5 text-primary border-primary/20 text-[8px] font-black h-5 uppercase">Pack {tenant?.secteurActivite}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pe-8">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <DatabaseZap className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Intégrité Structurelle (SCF) :</p>
          <p className="opacity-80 italic">
            "Le Plan de Comptes de l'Entité (PCE) est dérivé du plan modèle de votre secteur d'activité. Le maintien du lien avec l'origine (Standard 2026) garantit la conformité de vos futurs états financiers (Bilan, TCR) avec les rubriques de la liasse fiscale G4."
          </p>
        </div>
      </div>
    </div>
  )
}
