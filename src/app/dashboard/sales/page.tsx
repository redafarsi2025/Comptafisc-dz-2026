
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  CircleDollarSign, ShieldCheck, CheckCircle2, 
  ArrowRight, Calculator, FileSearch, Truck, 
  Receipt, CreditCard, Sparkles, AlertCircle, TrendingUp,
  Undo2, FileMinus, Plus, HandCoins, Loader2
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function SalesWorkflowHub() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  // Chargement des factures pour les stats de CA et TVA
  const invoicesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "invoices")) : null
  , [db, tenantId]);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection(invoicesQuery);

  // Chargement des retours clients pour le taux de non-conformité
  const returnsQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "customer_returns")) : null
  , [db, tenantId]);
  const { data: returns, isLoading: isLoadingReturns } = useCollection(returnsQuery);

  const stats = React.useMemo(() => {
    if (!invoices) return { ca: 0, tva: 0, returnRate: 0 };
    const ca = invoices.reduce((acc, inv) => acc + (inv.totalAmountExcludingTax || 0), 0);
    const tva = invoices.reduce((acc, inv) => acc + (inv.totalTaxAmount || 0), 0);
    const returnRate = invoices.length > 0 ? ((returns?.length || 0) / invoices.length) * 100 : 0;
    return { ca, tva, returnRate };
  }, [invoices, returns]);

  const steps = [
    { name: "Commande Client", icon: FileSearch, desc: "Engagement et réservation stock.", href: "/dashboard/sales/orders", status: "Action Requise" },
    { name: "Livraison (BL)", icon: Truck, desc: "Sortie de stock et transfert physique.", href: "/dashboard/sales/delivery", status: "En cours" },
    { name: "Facture", icon: Receipt, desc: "Document fiscal et TVA collectée.", href: "/dashboard/sales/invoices", status: "Prêt" },
    { name: "Retour Client", icon: Undo2, desc: "Réintégration stock et litiges.", href: "/dashboard/sales/returns", status: "Optionnel" },
    { name: "Avoir Client", icon: FileMinus, desc: "Régularisation fiscale et comptable.", href: "/dashboard/sales/credit-notes", status: "À venir" },
    { name: "Encaissement", icon: HandCoins, desc: "Lettrage et mise à jour trésorerie.", href: "/dashboard/sales/payments", status: "À venir" },
  ]

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <CircleDollarSign className="text-accent h-8 w-8" /> Hub Flux de Ventes
          </h1>
          <p className="text-muted-foreground font-medium">Cycle commercial complet conforme SCF & Fiscalité Algérie.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary shadow-lg" asChild>
            <Link href={`/dashboard/sales/orders?tenantId=${tenantId}`}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle Commande
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {steps.map((step, idx) => (
          <Card key={idx} className="relative group hover:shadow-xl transition-all border-t-4 border-t-primary overflow-hidden">
            <CardHeader className="p-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-bold">{step.name}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-12">
              <p className="text-[10px] text-muted-foreground leading-relaxed">{step.desc}</p>
            </CardContent>
            <CardFooter className="absolute bottom-0 w-full p-2 bg-muted/50 flex justify-between items-center">
               <Badge variant="outline" className="text-[8px] uppercase">{step.status}</Badge>
               <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                 <Link href={`${step.href}?tenantId=${tenantId}`}><ArrowRight className="h-3 w-3" /></Link>
               </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
          <CardHeader className="bg-primary text-white">
            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Performance Commerciale 2026</CardTitle>
            <CardDescription className="text-white/70">Analyse du CA réalisé basé sur les données réelles du dossier.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {(isLoadingInvoices || isLoadingReturns) ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-8">
                 <div className="text-center">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">CA Réalisé HT</p>
                   <h2 className="text-3xl font-black text-primary">
                     {stats.ca >= 1000000 ? `${(stats.ca / 1000000).toFixed(1)}M` : `${(stats.ca / 1000).toFixed(0)}k`} 
                     <span className="text-xs font-normal ml-1">DA</span>
                   </h2>
                 </div>
                 <div className="text-center">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">TVA à Reverser</p>
                   <h2 className="text-3xl font-black text-emerald-600">
                     {stats.tva >= 1000 ? `${(stats.tva / 1000).toFixed(0)}k` : stats.tva}
                   </h2>
                 </div>
                 <div className="text-center">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Retours (BRC)</p>
                   <h2 className="text-2xl font-black text-destructive">{stats.returnRate.toFixed(1)}%</h2>
                 </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Progression de l'exercice (Objectif simulé)</span>
                <span className="text-primary">{Math.min(100, Math.round((stats.ca / 5000000) * 100))}%</span>
              </div>
              <Progress value={Math.min(100, (stats.ca / 5000000) * 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
          <Sparkles className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" /> Conformité Ventes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-4 opacity-90 leading-relaxed">
            <p>
              Le SCF impose la comptabilisation de la vente dès le transfert de propriété (Bon de Livraison).
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-accent mt-0.5" />
                <span>NIF Client vérifié (Fac obligatoire)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-accent mt-0.5" />
                <span>Lettrage 411 Automatique</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10" asChild>
              <Link href={`/dashboard/contacts?tenantId=${tenantId}`}>
                Voir Registre des Tiers
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold underline uppercase mb-1">Rappel Réglementaire Algérie :</p>
          <p>
            L'article 10 de la loi comptable 07-11 impose que toute écriture soit appuyée par une pièce justificative datée et conservée. 
            Le <strong>Bon de Commande</strong> constitue la preuve de l'engagement, tandis que la <strong>Facture</strong> est l'élément déclencheur de la TVA déductible.
          </p>
        </div>
      </div>
    </div>
  )
}
