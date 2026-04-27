"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Anchor, Plus, Search, TrendingUp, 
  Ship, Globe, ShieldCheck, AlertTriangle,
  Calculator, History, Loader2, ArrowRight,
  Gavel, Scale, Database
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatDZD } from "@/utils/fiscalAlgerie"
import { cn } from "@/lib/utils"
import { useLocale } from "@/context/LocaleContext"

export default function CustomsDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const { t, isRtl } = useLocale()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const importsQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "customs_imports"), orderBy("createdAt", "desc"), limit(10)) : null
  , [db, tenantId]);
  const { data: imports, isLoading } = useCollection(importsQuery);

  const stats = React.useMemo(() => {
    if (!imports) return { totalCIF: 0, totalTaxes: 0, pending: 0 };
    return {
      totalCIF: imports.reduce((acc, i) => acc + (i.liquidation?.cif || 0), 0),
      totalTaxes: imports.reduce((acc, i) => acc + (i.liquidation?.totalTaxes || 0), 0),
      pending: imports.filter(i => i.status === 'PENDING').length
    };
  }, [imports]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Anchor className="text-accent h-8 w-8" /> {t.Customs.customs_hub}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Pilotage du Commerce Extérieur & Liquidation Douanière</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm" asChild>
            <Link href={`/dashboard/customs/simulator?tenantId=${tenantId}`}>
              <Calculator className="mr-2 h-4 w-4 text-primary" /> {t.Customs.simulator}
            </Link>
          </Button>
          <Button className="bg-primary shadow-xl rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest">
            <Plus className="mr-2 h-4 w-4" /> Nouvel Import
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl p-6 relative overflow-hidden flex flex-col justify-center">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Ship className="h-16 w-16 text-accent" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">{t.Customs.cif_value} (Cumul)</p>
           <h2 className="text-3xl font-black">{formatDZD(stats.totalCIF)}</h2>
        </Card>
        
        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Droits & Taxes (DD+TVA)</p>
           <h2 className="text-2xl font-black text-primary">{formatDZD(stats.totalTaxes)}</h2>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Dossiers en Douane</p>
           <h2 className="text-2xl font-black text-amber-600">{stats.pending} en attente</h2>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Conformité SH</p>
             <p className="text-[11px] text-emerald-600 font-medium">Libération automatisée</p>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Importations Récentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary">Voir tout</Button>
          </CardHeader>
          <CardContent className="p-0">
             {isLoading ? (
               <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></div>
             ) : !imports?.length ? (
               <div className="p-20 text-center space-y-4">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                    <Globe className="h-8 w-8" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucune opération import/export détectée.</p>
               </div>
             ) : (
               <div className="divide-y">
                 {imports.map((imp) => (
                   <div key={imp.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Ship className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-slate-900">{imp.reference || 'IMPORT-XXXX'}</p>
                          <p className="text-[9px] font-mono text-slate-400 font-bold uppercase">{imp.supplierName} • {imp.originCountry}</p>
                        </div>
                      </div>
                      <div className="flex gap-12 items-center">
                         <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase">{t.Customs.cif_value}</p>
                            <p className="text-sm font-black text-slate-900">{formatDZD(imp.liquidation?.cif || 0)}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Taxes</p>
                            <p className="text-sm font-black text-primary">+{formatDZD(imp.liquidation?.totalTaxes || 0)}</p>
                         </div>
                         <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-all">
                            <ArrowRight className="h-4 w-4" />
                         </Button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl overflow-hidden relative">
             <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
             <CardHeader className="bg-primary/20 border-b border-white/5 p-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Simulation Sourcing UE</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-4 p-6 text-start">
                <p className="text-[11px] leading-relaxed opacity-80 italic">
                  "L'accord d'association avec l'UE permet une réduction des droits de douane de 15% sur vos serveurs. Gain potentiel : **120 000 DA**."
                </p>
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 text-[10px] font-black uppercase h-10 rounded-xl" asChild>
                   <Link href={`/dashboard/customs/simulator?tenantId=${tenantId}`}>Lancer le comparatif</Link>
                </Button>
             </CardContent>
           </Card>

           <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-4">
             <Gavel className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
             <div className="text-[11px] leading-relaxed text-blue-900 font-medium">
               <p className="font-bold uppercase tracking-tight mb-1">Règle DAPS 2026 :</p>
               <p className="opacity-80">
                 Le Droit Additionnel Provisoire de Sauvegarde (DAPS) s'applique sur une liste de produits finis. Assurez-vous de la conformité du code SH avant l'ouverture du crédit documentaire.
               </p>
             </div>
           </div>

           <Card className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">
              <div className="flex items-start gap-3">
                 <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                 <div className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                   <p className="font-black uppercase tracking-tight mb-1">Comptabilité Automatisée :</p>
                   <p>La validation d'un import génère automatiquement les écritures de stock (Compte 38 ou 31) et de TVA récupérable (4456).</p>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}
