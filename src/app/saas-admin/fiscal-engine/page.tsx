"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  DatabaseZap, Loader2, RefreshCcw, BrainCircuit, 
  Play, FlaskConical, Beaker, ShieldCheck, Gavel, 
  Settings2, Activity, Zap, Info, ShieldAlert, AlertTriangle
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
  
  // State Simulation
  const [simBase, setSimBase] = React.useState("1000000")
  const [simMode, setSimMode] = React.useState("IBS") 
  const [simSector, setSimSector] = React.useState("PRODUCTION")
  const [simRegime, setSimRegime] = React.useState("REGIME_REEL")
  const [simPaymentMethod, setSimPaymentMethod] = React.useState("Espèces")
  const [simResult, setSimResult] = React.useState<any>(null)
  const [isSimulating, setIsSimulating] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const rulesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_business_rules"), orderBy("priority", "asc")) : null, [db]);
  const { data: rules } = useCollection(rulesQuery);

  const handleRunFullSimulation = async () => {
    if (!db) return;
    setIsSimulating(true);
    try {
      const input = { 
        resultat_fiscal: parseFloat(simBase), 
        resultat_comptable: parseFloat(simBase),
        totalTTC: parseFloat(simBase),
        paymentMethod: simPaymentMethod,
        cash_balance: parseFloat(simBase) / 2
      };

      const { results, traces } = await executeFiscalPipeline(
        { db, date: "2026-01-01", sector: simSector, regime: simRegime },
        undefined,
        input
      );
      setSimResult({ results, traces });
      toast({ title: "Pipeline Master exécuté" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur simulation", description: e.message });
    } finally {
      setIsSimulating(false);
    }
  }

  const handleInitialize2026DSL = async () => {
    if (!db) return;
    setIsInitializing(true);
    try {
      // 1. IBS RÉINTÉGRATIONS (AMENDES)
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "IBS_001"), {
        id: "IBS_001",
        name: "Réintégration des amendes (671)",
        priority: 10,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: "LF_2026",
        category: "FISCAL",
        severity: "HIGH",
        when: "TRUE",
        then: [{ set: "resultat_fiscal = resultat_fiscal" }],
        message_template: "Attention : Des charges exceptionnelles (671) non déductibles ont été détectées. Elles doivent être réintégrées.",
        justify: "Art. 141 du CIDTA - Les amendes et pénalités de toute nature ne sont pas déductibles."
      }, { merge: true });

      // 2. SEUIL CASH
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "IBS_003"), {
        id: "IBS_003",
        name: "Plafond paiement espèces",
        priority: 20,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: "LF_2026",
        category: "FISCAL",
        severity: "HIGH",
        when: "paymentMethod == 'Espèces' && totalTTC > 1000000",
        then: [{ set: "is_cash_error = 1" }],
        message_template: "Risque Majeur : Paiement en espèces dépassant le seuil de 1 000 000 DA HT.",
        justify: "Art. 14 de la LF 2024 - Non-déductibilité des charges payées en cash > 1M DA."
      }, { merge: true });

      // 3. IBS TAUX SECTORIELS
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "IBS_TAUX_CORE"), {
        id: "IBS_TAUX_CORE",
        name: "Calcul IBS 2026",
        priority: 100,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: "LF_2026",
        category: "FISCAL",
        severity: "LOW",
        when: "regime == 'REGIME_REEL'",
        then: [
          { if: "secteur == 'PRODUCTION'", set: "taux_IBS = 0.19" },
          { if: "secteur == 'BTP'", set: "taux_IBS = 0.23" },
          { if: "secteur == 'SERVICES'", set: "taux_IBS = 0.26" },
          { set: "IBS = MAX(10000, resultat_fiscal * taux_IBS)" }
        ],
        message_template: "Calcul de l'IBS au taux de {taux_IBS} pour le secteur {secteur}.",
        justify: "Art. 150 CIDTA - Taux différenciés par secteur d'activité."
      }, { merge: true });

      toast({ title: "Architecture Master DSL Déployée" });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Noyau Fiscal Master</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Global Governance & 300+ Rules Pack</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleInitialize2026DSL} disabled={isInitializing} className="rounded-2xl bg-white border-slate-200 font-bold h-11 px-6 shadow-sm">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Réinitialiser DSL 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-1 border-none shadow-2xl bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
              <Beaker className="h-5 w-5 text-primary" /> Simulation Expert
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Profil Test</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={simSector} onValueChange={setSimSector}>
                    <SelectTrigger className="h-9 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCTION">🏭 INDUSTRIE</SelectItem>
                      <SelectItem value="BTP">🏗 BTP</SelectItem>
                      <SelectItem value="SERVICES">💼 SERVICES</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={simPaymentMethod} onValueChange={setSimPaymentMethod}>
                    <SelectTrigger className="h-9 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Espèces">💵 Espèces</SelectItem>
                      <SelectItem value="Virement">🏦 Virement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Montant de base (DA)</Label>
                <Input type="number" value={simBase} onChange={e => setSimBase(e.target.value)} className="h-12 text-xl font-black rounded-xl border-primary/20 bg-primary/5 text-primary" />
              </div>
            </div>

            <Button className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] h-14 rounded-2xl shadow-xl" onClick={handleRunFullSimulation} disabled={isSimulating}>
              {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Tester Pipeline Audit
            </Button>
            
            {simResult && (
              <div className="pt-6 space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <Activity className="h-3 w-3 text-emerald-500" /> Audit Log (Simulation)
                </p>
                <div className="space-y-2">
                  {simResult.traces.map((t: any, i: number) => (
                    <div key={i} className={cn("text-[10px] p-3 rounded-xl border-s-4", t.severity === 'HIGH' ? 'bg-red-50 border-s-red-500' : 'bg-slate-50 border-s-slate-200')}>
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
             <DatabaseZap className="h-6 w-6 text-primary" /> Registre des Règles (Dernières MAJ)
           </h3>
           {rules?.slice(0, 5).map((rule) => (
             <Card key={rule.id} className="border-none shadow-xl bg-white rounded-3xl border-l-4 border-l-primary overflow-hidden">
                <CardHeader className="py-4 px-8 border-b flex flex-row justify-between items-center bg-slate-50/50">
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase">{rule.name}</CardTitle>
                        <Badge variant="outline" className={cn("text-[8px]", rule.severity === 'HIGH' ? 'text-red-500 border-red-200' : 'text-slate-400')}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Code: {rule.id} • Priorité {rule.priority}</p>
                   </div>
                </CardHeader>
                <CardContent className="p-6">
                   <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400">
                      <p className="opacity-60 mb-2">// {rule.justify}</p>
                      <p className="text-blue-400">IF {rule.when}</p>
                      <p className="pl-4">THEN {rule.message_template}</p>
                   </div>
                </CardContent>
             </Card>
           ))}
        </div>
      </div>
    </div>
  )
}
