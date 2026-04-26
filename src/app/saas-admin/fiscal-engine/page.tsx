"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DatabaseZap, Loader2, Sparkles, RefreshCcw, BrainCircuit, Check,
  Code2, Calculator, ShieldCheck, Play, FlaskConical, Beaker,
  TrendingUp, ArrowRight, Database, History, Gavel, Users, Banknote
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { parseFiscalUpdate } from "@/ai/flows/fiscal-update-parsing"
import { evaluateFiscalRule, executeFiscalPipeline } from "@/lib/fiscal-engine"

export default function FiscalEngineAdmin() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)
  const [aiInput, setAiInput] = React.useState("")
  const [isAiProcessing, setIsAiProcessing] = React.useState(false)
  const [aiProposals, setAiProposals] = React.useState<any[] | null>(null)

  const [simBase, setSimBase] = React.useState("1000000")
  const [simMode, setSimBaseMode] = React.useState("IBS") 
  const [simSector, setSimSector] = React.useState("PRODUCTION")
  const [simResult, setSimResult] = React.useState<any>(null)
  const [isSimulating, setIsSimulating] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const rulesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_business_rules"), orderBy("priority", "asc")) : null, [db]);
  const { data: rules } = useCollection(rulesQuery);

  const handleAiAnalysis = async () => {
    if (!aiInput.trim()) return
    setIsAiProcessing(true)
    try {
      const result = await parseFiscalUpdate({ text: aiInput })
      setAiProposals(result.proposals)
      toast({ title: "Analyse IA terminée", description: "Vérifiez les taux avant injection DSL." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur IA" })
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleRunFullSimulation = async () => {
    if (!db) return;
    setIsSimulating(true);
    try {
      const input = simMode === "PAIE" 
        ? { salaire_brut: parseFloat(simBase) }
        : { resultat_fiscal: parseFloat(simBase), secteur: simSector };

      const { results, traces } = await executeFiscalPipeline(
        { db, date: "2026-01-01" },
        undefined,
        input
      );
      setSimResult({ results, traces });
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
      const lawId = "LF_2026";
      
      // --- SECTORIAL IBS RULE ---
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_IBS_2026"), {
        id: "RULE_IBS_2026",
        code: "IBS_TAUX",
        name: "IBS : Taux Différenciés 2026",
        category: "FISCAL",
        priority: 100,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "resultat_fiscal > 0",
        then: [
          { if: "secteur == 'PRODUCTION'", set: "taux_IBS = 0.19" },
          { if: "secteur == 'BTP'", set: "taux_IBS = 0.23" },
          { if: "secteur == 'SERVICES'", set: "taux_IBS = 0.26" },
          { set: "IBS = resultat_fiscal * taux_IBS" }
        ],
        justify: "Application des taux différenciés selon le secteur d'activité (Art. 150 CIDTA)."
      }, { merge: true });

      // --- BTP SITUATION RULE ---
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_BTP_RETENUE"), {
        id: "RULE_BTP_RETENUE",
        code: "RETENUE_BTP",
        name: "BTP : Retenue de Garantie Légale",
        category: "COMPTA",
        priority: 50,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "secteur == 'BTP'",
        then: [
          { set: "retenue = montant_certifie * 0.05" }
        ],
        justify: "Retenue légale de garantie de 5% sur les situations de travaux."
      }, { merge: true });

      toast({ title: "Moteur Master DSL Initialisé", description: "Règles 2026 injectées." });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Moteur Fiscal Master</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Multi-Activity DSL & Pro Simulation</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleInitialize2026DSL} disabled={isInitializing} className="rounded-2xl bg-white border-slate-200 font-bold">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Réinitialiser DSL 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-1 border-none shadow-2xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
              <Beaker className="h-5 w-5 text-primary" /> Test Lab (Digital Twin)
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Simulation de l'impact des règles DSL</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Mode de calcul</Label>
                <Select value={simMode} onValueChange={setSimBaseMode}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IBS">IBS (Impôt Sociétés)</SelectItem>
                    <SelectItem value="PAIE">Paie (IRG/CNAS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Assiette (DA)</Label>
                <Input type="number" value={simBase} onChange={e => setSimBase(e.target.value)} className="rounded-xl" />
              </div>
              {simMode === "IBS" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Secteur Client</Label>
                  <Select value={simSector} onValueChange={setSimSector}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCTION">Production (19%)</SelectItem>
                      <SelectItem value="BTP">BTP (23%)</SelectItem>
                      <SelectItem value="SERVICES">Services (26%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl" onClick={handleRunFullSimulation} disabled={isSimulating}>
              {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Exécuter Pipeline Master
            </Button>
            
            {simResult && (
              <div className="pt-6 space-y-4 animate-in fade-in duration-300">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[9px] font-black text-primary uppercase mb-1">Impact Calculé</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-slate-900">
                      {simMode === "PAIE" ? (simResult.results.IRG || 0).toLocaleString() : (simResult.results.IBS || 0).toLocaleString()} DA
                    </span>
                    <Badge className="bg-primary text-white text-[8px] uppercase">{simMode === "PAIE" ? "IRG" : "IBS"}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Traces de calcul (Audit Trail) :</p>
                  {simResult.traces.map((t: any, i: number) => (
                    <div key={i} className="text-[9px] border-l-2 border-emerald-500 pl-3 py-1">
                      <p className="font-bold text-slate-700 uppercase">{t.ruleName}</p>
                      <p className="text-slate-400 italic">"{t.justification}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-8">
           <Card className="bg-emerald-50 border border-emerald-200 p-6 flex items-start gap-4 rounded-3xl">
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <p className="font-black uppercase tracking-widest mb-1">Note de Gouvernance SaaS :</p>
                <p>Le moteur DSL (Domain Specific Language) permet de décorréler la logique fiscale du code applicatif. Une mise à jour législative peut être déployée instantanément sur tous les dossiers sans mise à jour logicielle.</p>
              </div>
           </Card>

           <div className="space-y-6">
              {rules?.map((rule) => (
                <Card key={rule.id} className="border-none shadow-xl bg-white rounded-3xl border-l-4 border-l-primary overflow-hidden">
                  <CardHeader className="py-4 px-8 bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter">{rule.name}</CardTitle>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Priorité: {rule.priority} • Source: {rule.sourceLawId}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black">DSL v3.0</Badge>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[10px] text-emerald-400">
                      <p className="mb-2 text-blue-400 font-bold">WHEN {rule.when || "TRUE"}</p>
                      <div className="space-y-1 pl-4 border-l border-white/10">
                        {Array.isArray(rule.then) ? rule.then.map((t: any, i: number) => (
                          <p key={i} className="opacity-90">
                            <span className="text-slate-500">THEN</span> {t.set} 
                            {t.if && <span className="text-blue-300 ml-2">IF {t.if}</span>}
                          </p>
                        )) : (
                          <p className="opacity-90"><span className="text-slate-500">THEN</span> SET {rule.code} = {rule.formula}</p>
                        )}
                      </div>
                      <p className="mt-4 text-slate-400 italic border-t border-white/10 pt-3 flex items-start gap-2">
                        <Gavel className="h-3 w-3 mt-0.5 shrink-0" />
                        JUSTIFY: "{rule.justify}"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}
