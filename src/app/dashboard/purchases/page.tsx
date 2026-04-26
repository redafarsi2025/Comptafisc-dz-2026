
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ShoppingCart, ShieldCheck, CheckCircle2, 
  ArrowRight, Calculator, FileSearch, Truck, 
  Receipt, CreditCard, Sparkles, AlertCircle, TrendingDown,
  Undo2, FileMinus, Plus
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function PurchasesWorkflowHub() {
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')

  const steps = [
    { name: "Demande d'Achat", icon: ShoppingCart, desc: "Expression du besoin interne.", href: "/dashboard/purchases/requests", status: "Terminé" },
    { name: "Bon de Commande", icon: FileSearch, desc: "Engagement ferme fournisseur.", href: "/dashboard/purchases/orders", status: "Action Requise" },
    { name: "Réception (BR)", icon: Truck, desc: "Contrôle physique des marchandises.", href: "/dashboard/purchases/receptions", status: "En cours" },
    { name: "Contrôle Facture", icon: Receipt, desc: "3-Way Matching BC/BR/Facture.", href: "/dashboard/purchases/invoices", status: "À venir" },
    { name: "Retour / Avoir", icon: Undo2, desc: "Gestion des non-conformités.", href: "/dashboard/purchases/returns", status: "Optionnel" },
    { name: "Règlement", icon: CreditCard, desc: "Paiement et lettrage SCF.", href: "/dashboard/purchases/payments", status: "À venir" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <ShoppingCart className="text-accent h-8 w-8" /> Hub Flux d'Achats
          </h1>
          <p className="text-muted-foreground font-medium">Gestion du cycle de dépense conforme SCF & Contrôle Interne.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary shadow-lg" asChild>
            <Link href={`/dashboard/purchases/requests?tenantId=${tenantId}`}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle Demande
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
        <Card className="md:col-span-2 shadow-2xl border-none ring-1 ring-border overflow-hidden">
          <CardHeader className="bg-primary text-white">
            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Indicateurs de Performance Achat</CardTitle>
            <CardDescription className="text-white/70">Surveillance des délais et des économies générées.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-3 gap-8">
               <div className="text-center">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Délai de Validation</p>
                 <h2 className="text-3xl font-black text-primary">1.4 <span className="text-xs font-normal">jours</span></h2>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Taux d'Écarts BR</p>
                 <h2 className="text-3xl font-black text-amber-600">2.5%</h2>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Engagé HT</p>
                 <h2 className="text-2xl font-black">450k <span className="text-xs font-normal">DA</span></h2>
               </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Progression du budget annuel</span>
                <span className="text-primary">65%</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
          <Sparkles className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" /> Note de Conformité
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-4 opacity-90 leading-relaxed">
            <p>
              Le système applique la règle du <strong>3-Way Matching</strong>. Vous ne pouvez pas valider une facture fournisseur si elle n'est pas rapprochée d'un Bon de Commande validé et d'un Bon de Réception conforme.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-accent mt-0.5" />
                <span>NIF Fournisseur vérifié</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-accent mt-0.5" />
                <span>Lettrage SCF Automatique</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
              Consulter l'Audit Log
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
