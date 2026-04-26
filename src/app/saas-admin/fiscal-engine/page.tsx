
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
  Gavel, Settings2, CalendarClock, Plus, 
  Trash2, DatabaseZap, Loader2, Sparkles, RefreshCcw, BrainCircuit, Check,
  AlertTriangle, Code2, ListTree, Calculator, ShieldCheck, History, Eye, Play
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { parseFiscalUpdate } from "@/ai/flows/fiscal-update-parsing"

export default function FiscalEngineAdmin() {
  const db = useFirestore()
  const [isInitializing, setIsInitializing] = React.useState(false)
  const [aiInput, setAiInput] = React.useState("")
  const [isAiProcessing, setIsAiProcessing] = React.useState(false)
  const [aiProposals, setAiProposals] = React.useState<any[] | null>(null)

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
      toast({ title: "Analyse IA terminée", description: "Veuillez valider les propositions avant injection." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur IA" })
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleInitialize2026 = async () => {
    if (!db) return;
    setIsInitializing(true);
    try {
      // 1. Initialisation Loi Source
      const lawId = "LF_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_laws", lawId), {
        id: lawId,
        name: "Loi de Finances 2026",
        description: "Mise à jour majeure : SNMG 24k, nouveaux barèmes IRG lissés, et mesures IFU.",
        effectiveStartDate: "2026-01-01",
        publicationDate: "2025-12-30",
        status: 'VALIDATED'
      }, { merge: true });

      // 2. Initialisation Règle IRG Salarié (Complexe)
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
        smoothingThreshold: 35000
      }, { merge: true });

      toast({ title: "Moteur Fiscal 2026 prêt", description: "Lois, variables et règles complexes initialisées." });
    } finally {
      setIsInitializing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <DatabaseZap className="text-accent h-8 w-8" /> Moteur Fiscal Master
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Administration des lois, variables et règles de calcul dynamiques.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleInitialize2026} disabled={isInitializing} className="border-primary text-primary">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Initialiser Moteur 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IA Ingestion Panel */}
        <Card className="lg:col-span-1 border-t-4 border-t-accent shadow-lg bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <BrainCircuit className="h-5 w-5 text-accent" /> Assistant Ingestion IA
            </CardTitle>
            <CardDescription>Extraire les taux depuis un texte officiel (LF, Circulaire).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                Note: L'IA propose des modifications. Aucune donnée n'est injectée sans votre validation manuelle.
              </p>
            </div>
            <Textarea 
              placeholder="Collez le texte brut de la Loi de Finances ou du décret ici..." 
              className="min-h-[150px] bg-white text-xs"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <Button className="w-full bg-accent text-primary font-black shadow-md" onClick={handleAiAnalysis} disabled={isAiProcessing || !aiInput.trim()}>
              {isAiProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyser via Gemini 2.5
            </Button>
          </CardContent>
          {aiProposals && (
            <div className="px-6 pb-6 space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Check className="h-3 w-3" /> Propositions détectées :
              </p>
              {aiProposals.map((p, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border text-xs shadow-sm flex justify-between items-center group">
                  <div className="flex-1">
                    <p className="font-bold text-primary">{p.variableName}</p>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">{p.variableCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="font-mono bg-emerald-100 text-emerald-800 border-none">{p.value}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><Check className="h-3 w-3 text-emerald-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dynamic Engine Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="rules" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1 bg-muted/50 border">
              <TabsTrigger value="rules" className="py-2"><Code2 className="h-4 w-4 mr-2" /> Moteur de Règles</TabsTrigger>
              <TabsTrigger value="vars" className="py-2"><Settings2 className="h-4 w-4 mr-2" /> Variables</TabsTrigger>
              <TabsTrigger value="laws" className="py-2"><Gavel className="h-4 w-4 mr-2" /> Référentiel Lois</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold uppercase text-muted-foreground">Logique métier & Formules</h3>
                <Button size="sm" variant="outline" className="h-8 text-[10px]"><Plus className="h-3 w-3 mr-1" /> Créer Formule</Button>
              </div>
              <div className="grid gap-4">
                {rules?.map((rule) => (
                  <Card key={rule.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                    <CardHeader className="py-3 bg-muted/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            {rule.name}
                            <Badge variant="outline" className="text-[8px]">{rule.code}</Badge>
                          </CardTitle>
                          <p className="text-[10px] text-muted-foreground">Version du {rule.effectiveStartDate} • Loi: {rule.sourceLawId}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"><Play className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Settings2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3">
                      <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-emerald-400">
                        {rule.type === 'PROGRESSIVE_BRACKETS' && (
                          <div className="space-y-1">
                            <p className="text-slate-500">// Calcul Progressif par tranches</p>
                            {rule.brackets.map((b: any, idx: number) => (
                              <p key={idx}>IF (base &gt; {b.min}) THEN tax += (min(base, {b.max || 'inf'}) - {b.min}) * {b.rate}</p>
                            ))}
                            <p className="mt-2 text-blue-400">ABATEMENT = {rule.abatementFormula}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="vars">
              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[10px] uppercase">
                        <TableHead>Variable Code</TableHead>
                        <TableHead>Nom Lisible</TableHead>
                        <TableHead>Unité</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {types?.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-bold text-primary">{t.code}</TableCell>
                          <TableCell className="text-xs">{t.name}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{t.unit}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><History className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('fiscal_variable_types', t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="laws">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {laws?.map((law) => (
                  <Card key={law.id} className="border-t-2 border-t-primary">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold">{law.name}</CardTitle>
                        <Badge className="bg-emerald-500 text-white text-[8px]">VALIDE</Badge>
                      </div>
                      <CardDescription className="text-[10px] truncate">{law.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 text-[10px] text-muted-foreground flex justify-between">
                      <span>Effet: <strong>{law.effectiveStartDate}</strong></span>
                      <span>Publiée: {law.publicationDate}</span>
                    </CardContent>
                    <CardFooter className="bg-muted/20 p-2 flex justify-end">
                      <Button variant="ghost" size="sm" className="h-7 text-[9px]"><Eye className="h-3 w-3 mr-1" /> Dossier Source</Button>
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

  function handleDelete(col: string, id: string) {
    if (confirm("Supprimer cet élément ?")) {
      deleteDocumentNonBlocking(doc(db, col, id));
      toast({ title: "Supprimé" });
    }
  }
}
