
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
  TrendingUp, ArrowRight, Database
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { parseFiscalUpdate } from "@/ai/flows/fiscal-update-parsing"
import { evaluateFiscalRule } from "@/lib/fiscal-engine"

export default function FiscalEngineAdmin() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)
  const [aiInput, setAiInput] = React.useState("")
  const [isAiProcessing, setIsAiProcessing] = React.useState(false)
  const [aiProposals, setAiProposals] = React.useState<any[] | null>(null)

  const [simBase, setSimBase] = React.useState("45000")
  const [simResult, setSimResult] = React.useState<number | null>(null)
  const [isSimulating, setIsSimulating] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const lawsQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_laws"), orderBy("publicationDate", "desc")) : null, [db]);
  const { data: laws } = useCollection(lawsQuery);

  const typesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_variable_types"), orderBy("name", "asc")) : null, [db]);
  const { data: types } = useCollection(typesQuery);

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

  const handleRunSimulation = async (ruleCode: string) => {
    if (!db) return;
    setIsSimulating(true);
    try {
      const res = await evaluateFiscalRule(
        { db, date: new Date().toISOString().split('T')[0] },
        ruleCode,
        { base: parseFloat(simBase) }
      );
      setSimResult(res);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsSimulating(false);
    }
  }

  const handleInitialize2026 = async () => {
    if (!db) return;
    setIsInitializing(true);
    try {
      const lawId = "LF_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_laws", lawId), {
        id: lawId,
        name: "Loi de Finances 2026",
        description: "Mise à jour SNMG 24k et barèmes IRG lissés.",
        effectiveStartDate: "2026-01-01",
        publicationDate: "2025-12-30",
        status: 'VALIDATED'
      }, { merge: true });

      // Règle IBS via nouveau moteur DSL
      const ibsRuleId = "RULE_IBS_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", ibsRuleId), {
        id: ibsRuleId,
        code: "IBS_CALC",
        name: "Calcul IBS 2026",
        category: "FISCAL",
        priority: 300,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "resultat > 0",
        then: [
          { if: "secteur == 'PRODUCTION'", set: "IBS = resultat * 0.19" },
          { if: "secteur == 'BTP'", set: "IBS = resultat * 0.26" },
          { if: "secteur == 'SERVICES'", set: "IBS = resultat * 0.23" }
        ],
        justify: "Calcul de l'IBS selon le taux préférentiel par secteur (Art. 150 CIDTA)."
      }, { merge: true });

      const irgRuleId = "RULE_IRG_SALARY_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", irgRuleId), {
        id: irgRuleId,
        code: "IRG_SALARY",
        name: "Calcul IRG Salarié 2026",
        type: "PROGRESSIVE_BRACKETS",
        category: "FISCAL",
        priority: 200,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        active: true,
        brackets: [
          { min: 0, max: 20000, rate: 0 },
          { min: 20000, max: 40000, rate: 0.23 },
          { min: 40000, max: 80000, rate: 0.27 },
          { min: 80000, max: 160000, rate: 0.30 },
          { min: 160000, max: 320000, rate: 0.33 },
          { min: 320000, max: null, rate: 0.35 }
        ],
        abatementFormula: "Math.max(1000, Math.min(1500, tax * 0.4))",
        smoothingEnabled: true,
        smoothingThreshold: 30000,
        justify: "Barème progressif avec abattement de 40% et lissage pour les bas salaires."
      }, { merge: true });

      toast({ title: "Moteur 2026 Prêt (DSL Edition)" });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Moteur Fiscal Master</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Legislative Logic & DSL Engine</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleInitialize2026} disabled={isInitializing} className="rounded-2xl bg-white border-slate-200 font-bold">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Initialiser DSL 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-1 border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl ring-1 ring-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
              <BrainCircuit className="h-5 w-5 text-primary" /> IA Gemini Vision
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Extraction de données législatives</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Textarea 
              placeholder="Collez le texte officiel ici..." 
              className="min-h-[180px] bg-slate-50 border-slate-200 text-xs rounded-2xl focus-visible:ring-primary/20"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <Button className="w-full bg-primary text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl shadow-lg shadow-primary/20" onClick={handleAiAnalysis} disabled={isAiProcessing || !aiInput.trim()}>
              {isAiProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyse & Mapping DSL
            </Button>
            {aiProposals && (
              <div className="pt-6 space-y-3 animate-in fade-in duration-300">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Extractions détectées :</p>
                {aiProposals.map((p, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 text-[10px] uppercase tracking-tighter">{p.variableName}</p>
                      <p className="text-[8px] font-mono text-primary mt-0.5">{p.variableCode}</p>
                    </div>
                    <Badge className="bg-white border-slate-200 text-emerald-600 font-black text-[10px] h-6">{p.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="rules" className="w-full">
            <TabsList className="bg-slate-100 border border-slate-200 p-1.5 rounded-3xl h-auto mb-8">
              <TabsTrigger value="rules" className="rounded-2xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold"><Code2 className="h-4 w-4 mr-2" /> Pipeline DSL</TabsTrigger>
              <TabsTrigger value="lab" className="rounded-2xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold"><FlaskConical className="h-4 w-4 mr-2" /> Simulation</TabsTrigger>
              <TabsTrigger value="vars" className="rounded-2xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold"><DatabaseZap className="h-4 w-4 mr-2" /> Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-6">
              {rules?.map((rule) => (
                <Card key={rule.id} className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-3xl border-l-4 border-l-primary group">
                  <CardHeader className="py-4 px-8 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                          {rule.name}
                          <Badge variant="outline" className="text-[8px] h-4 font-mono">{rule.code}</Badge>
                        </CardTitle>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Actif depuis : {rule.effectiveStartDate} • Priorité: {rule.priority}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black border-none h-5">ACTIVE</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[10px] text-emerald-400 shadow-inner">
                      <p className="mb-2 text-blue-400">WHEN {rule.when || "TRUE"}</p>
                      {Array.isArray(rule.then) ? rule.then.map((t: any, i: number) => (
                        <p key={i} className="mb-1 opacity-90">THEN SET {t.set} {t.if ? `IF ${t.if}` : ""}</p>
                      )) : (
                        <p className="opacity-90">THEN SET {rule.code} = {rule.formula}</p>
                      )}
                      <p className="mt-4 text-slate-400 italic border-t border-white/10 pt-3">JUSTIFY: "{rule.justify}"</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="lab">
              <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl ring-1 ring-slate-200">
                <CardHeader className="border-b border-slate-100 p-8">
                  <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tighter">
                    <Beaker className="h-6 w-6 text-primary" /> Simulation Lab
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Base Imposable (DA)</Label>
                      <Input type="number" value={simBase} onChange={e => setSimBase(e.target.value)} className="h-14 text-2xl font-black rounded-2xl border-slate-200 bg-slate-50 px-6" />
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-center items-center text-center shadow-inner">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Résultat Estimé</p>
                      <h2 className="text-3xl font-black text-primary tracking-tighter">
                        {isSimulating ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (simResult?.toLocaleString() || "---")} <span className="text-sm font-normal">DA</span>
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rules?.map((r) => (
                      <Button key={r.id} variant="outline" className="justify-between h-12 rounded-2xl border-slate-200 hover:bg-slate-50 hover:border-primary/30 transition-all font-bold group px-6" onClick={() => handleRunSimulation(r.code)}>
                        <span className="flex items-center gap-3"><Play className="h-4 w-4 text-emerald-600" /> {r.name}</span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vars">
              <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden ring-1 ring-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Variable Code</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Description Nom</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Unité</TableHead>
                      <TableHead className="text-right font-black text-[10px] uppercase tracking-widest py-6 px-8">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {types?.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="py-6 px-8 font-mono text-xs font-black text-primary">{t.code}</TableCell>
                        <TableCell className="py-6 text-xs font-bold text-slate-700">{t.name}</TableCell>
                        <TableCell className="py-6"><Badge variant="secondary" className="text-[9px] font-black h-5 bg-slate-100 text-slate-500 uppercase">{t.unit}</Badge></TableCell>
                        <TableCell className="py-6 text-right px-8">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "fiscal_variable_types", t.id))}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
