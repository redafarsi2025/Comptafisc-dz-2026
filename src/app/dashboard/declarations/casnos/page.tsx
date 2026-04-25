
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Landmark, Calculator, Info, Download, ShieldCheck, AlertCircle, Clock, CalendarDays } from "lucide-react"
import { CASNOS_CONSTANTS, calculateCASNOS } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"

export default function CasnosDeclaration() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [annualBase, setAnnualBase] = React.useState<number>(0)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const contribution = calculateCASNOS(annualBase);
  const isAgri = currentTenant?.secteurActivite === "AGRICULTURE";
  const deadline = isAgri ? "30 Septembre 2026" : "30 Juin 2026";

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Landmark className="h-8 w-8 text-accent" /> Cotisations CASNOS
          </h1>
          <p className="text-muted-foreground text-sm">Gestion du régime des non-salariés (Décrets 83-14 et 15-289).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Formulaires CASNOS</Button>
          <Button className="bg-primary shadow-lg" disabled={!currentTenant}>Soumettre Attestation</Button>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 font-bold">Échéance de Paiement 2026</AlertTitle>
        <AlertDescription className="text-blue-700 text-xs">
          La date limite de paiement pour l'exercice en cours est fixée au <strong>{deadline}</strong>. 
          Les majorations de retard sont de 5% à l'échéance + 1% par mois supplémentaire.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-t-4 border-t-primary shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Calculateur de Cotisation (15%)</CardTitle>
            <CardDescription>Saisissez votre assiette annuelle pour estimer votre versement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Assiette Annuelle (Bilan N-2 ou CA G12 bis)
                </label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={annualBase || ""} 
                    onChange={(e) => setAnnualBase(parseFloat(e.target.value) || 0)} 
                    className="text-lg font-bold pr-12"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-muted-foreground">DA</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  {currentTenant?.regimeFiscal === 'IFU' 
                    ? "Base : Chiffre d'affaires G12 bis de l'année précédente." 
                    : "Base : Bénéfice net comptable de l'année N-2."}
                </p>
              </div>
              <div className="p-6 bg-primary/5 border rounded-xl flex flex-col justify-center items-center text-center">
                <p className="text-[10px] uppercase font-bold text-primary mb-1">Montant à Verser</p>
                <h2 className="text-3xl font-black text-primary">{contribution.toLocaleString()} DA</h2>
                <Badge variant="outline" className="mt-2 text-[10px] bg-white">
                  {contribution === CASNOS_CONSTANTS.MIN_AMOUNT ? "MINIMUM APPLIQUÉ" : 
                   contribution === CASNOS_CONSTANTS.MAX_AMOUNT ? "PLAFOND ATTEINT" : "TAUX STANDARD 15%"}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Options de Paiement (Échelonnement)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl bg-muted/20">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Versement Trimestriel</p>
                  <p className="text-lg font-black">{(contribution / 4).toLocaleString()} DA</p>
                  <p className="text-[9px] text-muted-foreground">Option disponible pour les dossiers à jour.</p>
                </div>
                <div className="p-4 border rounded-xl bg-emerald-50 border-emerald-100 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-emerald-800 uppercase leading-tight">Attestation de Mise à Jour</p>
                    <p className="text-[10px] text-emerald-600">Délivrée immédiatement après versement.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Sanctions non-déclaration
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[10px] text-amber-700 leading-relaxed space-y-2">
              <p>Le défaut de déclaration d'activité sous 10 jours entraîne :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Amende fixe de <strong>5 000 DA</strong>.</li>
                <li>Majoration de <strong>20%</strong> par mois de retard.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-sm font-bold">Rappel des Seuils 2026</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-xs border-b pb-2">
                <span className="text-muted-foreground">Cotisation Min.</span>
                <span className="font-bold">{CASNOS_CONSTANTS.MIN_AMOUNT.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-xs border-b pb-2">
                <span className="text-muted-foreground">Cotisation Max.</span>
                <span className="font-bold">{CASNOS_CONSTANTS.MAX_AMOUNT.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Taux Applicable</span>
                <Badge className="bg-primary h-4">15.0%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-start gap-4 shadow-xl">
        <Info className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Note sur l'Assiette de Cotisation (Art. 15 Décret 15-289) :</p>
          <p className="opacity-80">
            L'assiette est constituée du revenu annuel imposable ou du chiffre d'affaires déclaré à l'administration fiscale. 
            Le défaut de présentation des justificatifs fiscaux entraîne une taxation d'office sur une assiette forfaitaire déterminée par la commission locale.
          </p>
        </div>
      </div>
    </div>
  )
}
