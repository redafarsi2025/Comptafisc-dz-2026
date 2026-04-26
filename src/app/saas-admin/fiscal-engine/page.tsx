
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
  TrendingUp, Scale, AlertTriangle, ArrowRight
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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

  // Simulation Lab States
  const [simBase, setSimBase] = React.useState("45000")
  const [simResult, setSimResult] = React.useState<number | null>(null)
  const [isSimulating, setIsSimulating] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const lawsQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_laws"), orderBy("publicationDate", "desc")) : null, [db]);
  const { data: laws } = useCollection(lawsQuery);

  const typesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_variable_types"), orderBy("name", "asc")) : null, [db]);
  const { data: types } = useCollection(typesQuery);

  const rulesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_business_rules"), orderBy("effectiveStartDate", "desc")) : null, [db]);
  const { data: rules } = useCollection(rulesQuery);

  const handleAiAnalysis = async () => {
    if (!aiInput.trim()) return
    setIsAiProcessing(true)
    try {
      const result = await parseFiscalUpdate({ text: aiInput })
      setAiProposals(result.proposals)
      toast({ title: "Analyse IA terminée", description: "Vérifiez les taux extraits avant injection." });
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
      toast({ variant: "destructive", title: "Erreur Sim", description: e.message });
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

      const irgRuleId = "RULE_IRG_SALARY_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", irgRuleId), {
        id: irgRuleId,
        code: "IRG_SALARY",
        name: "Calcul IRG Salarié 2026",
        type: "PROGRESSIVE_BRACKETS",
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
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
        smoothingThreshold: 30000
      }, { merge: true });

      toast({ title: "Moteur 2026 Initialisé", description: "Barèmes IRG et variables injectés." });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <DatabaseZap className="text-accent h-8 w-8" /> Moteur Fiscal Master
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Administration du noyau réglementaire et des règles de calcul dynamiques.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleInitialize2026} disabled={isInitializing} className="border-primary text-primary">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Initialiser Standards 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-t-4 border-t-accent shadow-lg bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <BrainCircuit className="h-5 w-5 text-accent" /> Ingestion IA Gemini
            </CardTitle>
            <CardDescription>Extraction des taux depuis les textes officiels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Collez le texte brut de la Loi de Finances ou d'un décret ici..." 
              className="min-h-[150px] bg-white text-xs"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <Button className="w-full bg-accent text-primary font-black shadow-md" onClick={handleAiAnalysis} disabled={isAiProcessing || !aiInput.trim()}>
              {isAiProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyse Contextuelle
            </Button>
            {aiProposals && (
              <div className="pt-4 space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">Propositions détectées :</p>
                {aiProposals.map((p, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border text-[10px] shadow-sm flex justify-between items-center group">
                    <div className="flex-1">
                      <p className="font-bold text-primary">{p.variableName}</p>
                      <p className="text-[8px] font-mono uppercase opacity-60">{p.variableCode}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none ml-2">{p.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="rules" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 h-auto p-1 bg-muted/50 border">
              <TabsTrigger value="rules" className="py-2"><Code2 className="h-4 w-4 mr-2" /> Règles</TabsTrigger>
              <TabsTrigger value="lab" className="py-2"><FlaskConical className="h-4 w-4 mr-2" /> Simulation</TabsTrigger>
              <TabsTrigger value="vars" className="py-2"><DatabaseZap className="h-4 w-4 mr-2" /> Variables</TabsTrigger>
              <TabsTrigger value="laws" className="py-2"><Check className="h-4 w-4 mr-2" /> Lois</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4">
              {rules?.map((rule) => (
                <Card key={rule.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                  <CardHeader className="py-3 bg-muted/10">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          {rule.name}
                          <Badge variant="outline" className="text-[8px]">{rule.code}</Badge>
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground">Version du {rule.effectiveStartDate} • Loi: {rule.sourceLawId}</p>
                      </div>
                      <Badge className="bg-emerald-500 text-white text-[8px]">ACTIVE</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="bg-slate-900 rounded-lg p-3 font-mono text-[9px] text-emerald-400 space-y-1">
                      {rule.type === 'PROGRESSIVE_BRACKETS' && rule.brackets?.map((b: any, i: number) => (
                        <p key={i}>IF (base &gt; {b.min}) THEN tax += (min(base, {b.max || 'inf'}) - {b.min}) * {b.rate}</p>
                      ))}
                      {rule.abatementFormula && <p className="mt-2 text-blue-400">ABATEMENT = {rule.abatementFormula}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="lab">
              <Card className="border-2 border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Beaker className="h-5 w-5 text-accent" /> Simulation Lab</CardTitle>
                  <CardDescription>Tester la logique fiscale sur des cas d'usage réels.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Base Imposable (DA)</Label>
                      <Input type="number" value={simBase} onChange={e => setSimBase(e.target.value)} className="text-lg font-bold" />
                    </div>
                    <div className="p-6 bg-primary/5 rounded-xl border flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Résultat Calculé</p>
                      <h2 className="text-3xl font-black text-primary">
                        {isSimulating ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (simResult?.toLocaleString() || "---")} DA
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rules?.map((r) => (
                      <Button key={r.id} variant="outline" className="justify-between group" onClick={() => handleRunSimulation(r.code)}>
                        <span className="flex items-center gap-2"><Play className="h-3 w-3 text-emerald-600" /> {r.name}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vars">
              <Card className="border shadow-none overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="text-[10px] uppercase">
                      <TableHead>Variable Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Unité</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {types?.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold text-primary">{t.code}</TableCell>
                        <TableCell className="text-xs">{t.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{t.unit}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "fiscal_variable_types", t.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="laws">
              <div className="grid md:grid-cols-2 gap-4">
                {laws?.map((law) => (
                  <Card key={law.id} className="border-t-2 border-t-primary">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold">{law.name}</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      </div>
                      <CardDescription className="text-[10px]">{law.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 flex justify-between text-[9px] font-bold text-muted-foreground uppercase">
                      <span>Effet : {law.effectiveStartDate}</span>
                      <span>Publiée : {law.publicationDate}</span>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
