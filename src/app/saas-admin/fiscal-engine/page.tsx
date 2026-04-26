
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

  const [simBase, setSimBase] = React.useState("100000")
  const [simMode, setSimBaseMode] = React.useState("PAIE") 
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
      toast({ title: "Analyse IA terminée", description: "Vérifiez les taux avant injection." });
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
        ? { salaire_brut: parseFloat(simBase), heures_sup: 0, jours_absence: 0 }
        : { resultat_fiscal: parseFloat(simBase), secteur: simSector, multi_activite: false };

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
        name: "IBS : Taux par secteur 2026",
        category: "FISCAL",
        priority: 100,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "resultat_fiscal > 0",
        then: [
          { if: "secteur == 'PRODUCTION'", set: "taux_IBS = 0.19" },
          { if: "secteur == 'BTP'", set: "taux_IBS = 0.23" },
          { if: "secteur == 'SERVICES' || secteur == 'COMMERCE'", set: "taux_IBS = 0.26" },
          { set: "IBS = resultat_fiscal * taux_IBS" }
        ],
        justify: "Modèle fiscal 2026 : IBS différencié par activité (Art. 150 CIDTA)."
      }, { merge: true });

      // --- BTP SPECIFIC RULE ---
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_BTP_RETENUE"), {
        id: "RULE_BTP_RETENUE",
        code: "RETENUE_GARANTIE",
        name: "BTP : Retenue de Garantie 5%",
        category: "COMPTA",
        priority: 50,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "secteur == 'BTP' && facture_ht > 0",
        then: [
          { set: "retenue = facture_ht * 0.05" },
          { set: "net_a_payer = (facture_ht * 1.19) - retenue" }
        ],
        justify: "Modèle BTP : Retenue légale de garantie de 5% sur situations de travaux."
      }, { merge: true });

      // --- AGRICULTURE EXEMPTION ---
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_AGRI_EXEMPT"), {
        id: "RULE_AGRI_EXEMPT",
        code: "AGRI_EXEMPTION",
        name: "Agriculture : Exonération Totale",
        category: "FISCAL",
        priority: 1,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "secteur == 'AGRICULTURE'",
        then: [
          { set: "TVA = 0" },
          { set: "IBS = 0" },
          { set: "IRG = 0" }
        ],
        justify: "Exonération fiscale permanente pour les activités agricoles."
      }, { merge: true });

      // --- PAIE ENGINE 2026 ---
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_BASE_IRG"), {
        id: "RULE_BASE_IRG",
        code: "BASE_IRG",
        name: "Paie : Détermination Base IRG",
        category: "SOCIAL",
        priority: 10,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "salaire_brut > 0",
        then: [
          { set: "cnas_salariale = salaire_brut * 0.09" },
          { set: "salaire_imposable = salaire_brut - cnas_salariale" }
        ],
        justify: "Déduction CNAS ouvrière (9%) pour obtenir le revenu imposable."
      }, { merge: true });

      toast({ title: "Moteur Multi-Activités 2026 Initialisé" });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Moteur Fiscal Master</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Multi-Activity DSL & 2026 Compliance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleInitialize2026DSL} disabled={isInitializing} className="rounded-2xl bg-white border-slate-200 font-bold">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Initialiser Modèle Multi-Secteurs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-1 border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl ring-1 ring-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
              <Beaker className="h-5 w-5 text-primary" /> Simulation Lab
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Test des modèles sectoriels</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Tabs value={simMode} onValueChange={setSimBaseMode} className="w-full">
               <TabsList className="grid grid-cols-2 mb-4">
                 <TabsTrigger value="PAIE" className="text-[10px] font-black">PAIE & IRG</TabsTrigger>
                 <TabsTrigger value="IBS" className="text-[10px] font-black">FISCALITÉ IBS</TabsTrigger>
               </TabsList>
            </Tabs>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">{simMode === "PAIE" ? "Salaire Brut (DA)" : "Résultat Fiscal (DA)"}</Label>
                <Input type="number" value={simBase} onChange={e => setSimBase(e.target.value)} className="rounded-xl" />
              </div>
              {simMode === "IBS" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Secteur</Label>
                  <Select value={simSector} onValueChange={setSimSector}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCTION">Production (19%)</SelectItem>
                      <SelectItem value="BTP">BTP (23%)</SelectItem>
                      <SelectItem value="SERVICES">Services (26%)</SelectItem>
                      <SelectItem value="AGRICULTURE">Agriculture (0%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl shadow-lg" onClick={handleRunFullSimulation} disabled={isSimulating}>
              {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Tester Modèle DSL
            </Button>
            
            {simResult && (
              <div className="pt-6 space-y-4 animate-in fade-in duration-300">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[9px] font-black text-primary uppercase mb-1">Impact Calculé ({simSector})</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-slate-900">
                      {simMode === "PAIE" ? (simResult.results.IRG || 0).toLocaleString() : (simResult.results.IBS || 0).toLocaleString()} DA
                    </span>
                    <Badge className="bg-primary text-white text-[8px] uppercase">{simMode === "PAIE" ? "IRG FINAL" : "IBS FINAL"}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Traces d'Audit (Compliance) :</p>
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
                <p className="font-black uppercase tracking-widest mb-1">Audit de Modèle Multi-Secteurs :</p>
                <p>Le moteur DSL applique désormais une hiérarchie de règles isolées par profil métier. Un dossier classé en "AGRICULTURE" sera automatiquement exonéré via la règle `RULE_AGRI_EXEMPT`, tandis qu'un dossier "BTP" appliquera la retenue de garantie sur ses flux de facturation.</p>
              </div>
           </Card>

           <div className="space-y-6">
              {rules?.map((rule) => (
                <Card key={rule.id} className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-3xl border-l-4 border-l-primary overflow-hidden group">
                  <CardHeader className="py-4 px-8 bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter">{rule.name}</CardTitle>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Priorité: {rule.priority} • {rule.category}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black h-5">DSL v3.1</Badge>
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
