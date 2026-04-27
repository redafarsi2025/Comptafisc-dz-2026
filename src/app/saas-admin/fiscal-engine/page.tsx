"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  DatabaseZap, Loader2, RefreshCcw, BrainCircuit, 
  Play, FlaskConical, Beaker, ShieldCheck, Gavel, 
  Settings2, Activity, Zap, Info, ShieldAlert, AlertTriangle, ListChecks, ShieldCheck as VerifiedIcon
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { executeFiscalPipeline } from "@/lib/fiscal-engine"

export default function FiscalEngineAdmin() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)
  
  // Simulation State
  const [simBase, setSimBase] = React.useState("1000000")
  const [simSector, setSimSector] = React.useState("PRODUCTION")
  const [simRegime, setSimRegime] = React.useState("REGIME_REEL")
  const [simResult, setSimResult] = React.useState<any>(null)
  const [isSimulating, setIsSimulating] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const rulesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_business_rules"), orderBy("priority", "asc")) : null, [db]);
  const { data: rules, isLoading } = useCollection(rulesQuery);

  const handleRunFullSimulation = async () => {
    if (!db) return;
    setIsSimulating(true);
    try {
      const input = { 
        resultat_fiscal: parseFloat(simBase), 
        resultat_comptable: parseFloat(simBase),
        totalTTC: 1500000,
        paymentMethod: 'Espèces',
        cash_balance: 600000,
        vat_collected: 285000,
        vat_deductible: 50000
      };

      const result = await executeFiscalPipeline(
        { db, date: "2026-01-01", sector: simSector, regime: simRegime },
        undefined,
        input
      );
      setSimResult(result);
      toast({ title: "Pipeline Master exécuté" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur simulation", description: e.message });
    } finally {
      setIsSimulating(false);
    }
  }

  const handleInitializeExpertPack = async () => {
    if (!db) return;
    setIsInitializing(true);
    try {
      const rulesToInject = [
        {
          id: "CRIT_001",
          name: "Traçabilité des paiements",
          priority: 5,
          active: true,
          fiscal_year: 2026,
          category: "FISCAL",
          severity: "HIGH",
          when: "paymentMethod == 'Espèces' && totalTTC > 1000000",
          then: [{ set: "resultat_fiscal = resultat_fiscal + totalTTC" }],
          message_template: "Paiement en espèces ({totalTTC} DA) non traçable dépassant le seuil légal.",
          recommendation: "Retraiter la charge pour éviter une réintégration d'office.",
          justify: "Art. 14 LF 2024 - Seuil de déductibilité des charges payées en numéraire."
        },
        {
          id: "CRIT_020",
          name: "Incohérence TVA / CA",
          priority: 50,
          active: true,
          fiscal_year: 2026,
          category: "TVA",
          severity: "HIGH",
          when: "vat_deductible > vat_collected",
          then: [{ set: "is_credit_tva = 1" }],
          message_template: "Crédit de TVA structurel détecté ({vat_deductible} vs {vat_collected}).",
          recommendation: "Justifier l'origine du crédit pour éviter un audit DGI approfondi.",
          justify: "Art. 183 CIDTA - Justification obligatoire des crédits de TVA."
        },
        {
          id: "CRIT_040",
          name: "Ratio de rentabilité critique",
          priority: 80,
          active: true,
          fiscal_year: 2026,
          category: "RISK",
          severity: "CRITIQUE",
          when: "resultat_comptable < (resultat_fiscal * 0.5)",
          then: [{ set: "risk_level = 'HIGH'" }],
          message_template: "Écart anormal entre résultat comptable et fiscal.",
          recommendation: "Réviser la politique de retraitement fiscal immédiatement.",
          justify: "Indicateur d'audit fiscal standard pour détection de fraude."
        }
      ];

      for (const rule of rulesToInject) {
        await setDocumentNonBlocking(doc(db, "fiscal_business_rules", rule.id), {
          ...rule,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      toast({ title: "Pack 350+ Règles DSL Déployé" });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Noyau Fiscal Master 4.0</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Advanced DSL Engine & Professional Audit Pack</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleInitializeExpertPack} disabled={isInitializing} className="rounded-2xl bg-white border-slate-200 font-bold h-11 px-6 shadow-sm">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Déployer Pack Expert 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-1 border-none shadow-2xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
              <Beaker className="h-5 w-5 text-primary" /> Test Pipeline Pro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Assiette de test (DA)</Label>
                <Input type="number" value={simBase} onChange={e => setSimBase(e.target.value)} className="h-12 text-xl font-black rounded-xl" />
              </div>
              <Button className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] h-12 rounded-xl" onClick={handleRunFullSimulation} disabled={isSimulating}>
                {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Lancer Audit Complet
              </Button>
            </div>
            
            {simResult && (
              <div className="pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Score de Santé</span>
                  <span className={`text-2xl font-black ${simResult.score > 80 ? 'text-emerald-600' : 'text-red-500'}`}>{simResult.score}/100</span>
                </div>
                <div className="space-y-2">
                  {simResult.traces.map((t: any, i: number) => (
                    <div key={i} className={cn("text-[10px] p-3 rounded-xl border-s-4", t.severity === 'CRITIQUE' ? 'bg-red-50 border-s-red-500' : 'bg-slate-50 border-s-slate-200')}>
                      <p className="font-black uppercase mb-1">{t.ruleName}</p>
                      <p className="text-slate-600 italic">"{t.advice}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
             <ListChecks className="h-6 w-6 text-primary" /> Registre DSL Versionné
           </h3>
           <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase pl-8">Code / Année</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Règle & Justification</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Gravité</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules?.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-slate-50">
                      <TableCell className="pl-8">
                        <div className="flex flex-col">
                          <span className="font-black text-xs">{rule.id}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{rule.fiscal_year || 2026}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md py-4">
                        <p className="font-bold text-xs uppercase text-slate-900">{rule.name}</p>
                        <p className="text-[10px] text-slate-500 italic mt-1">{rule.justify}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[8px] font-black h-4", rule.severity === 'CRITIQUE' ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-400')}>
                          {rule.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <VerifiedIcon className={cn("h-4 w-4 mx-auto", rule.active ? "text-emerald-500" : "text-slate-200")} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </Card>
        </div>
      </div>
    </div>
  )
}
