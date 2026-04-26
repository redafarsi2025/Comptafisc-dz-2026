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
  const [simMode, setSimBaseMode] = React.useState("PAIE") // PAIE or IBS
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
      
      // --- BLOC FISCALITÉ ENTREPRISE ---
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
        justify: "Application des taux IBS différentiés selon l'activité (Art. 150 CIDTA)."
      }, { merge: true });

      // --- BLOC PAIE & IRG 2026 ---
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

      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_ABATTEMENT_IRG"), {
        id: "RULE_ABATTEMENT_IRG",
        code: "ABATTEMENT_IRG",
        name: "Paie : Abattement 40% (2026)",
        category: "SOCIAL",
        priority: 20,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "salaire_imposable > 0",
        then: [
          { set: "val_abattement = salaire_imposable * 0.40" },
          { if: "val_abattement > 12000", set: "val_abattement = 12000" },
          { set: "base_IRG_net = salaire_imposable - val_abattement" }
        ],
        justify: "Application de l'abattement 40% plafonné à 12 000 DA (Art. 104 CIDTA)."
      }, { merge: true });

      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_IRG_PROGRESSIF"), {
        id: "RULE_IRG_PROGRESSIF",
        code: "IRG_FINAL",
        name: "Paie : Barème Progressif IRG",
        category: "SOCIAL",
        priority: 30,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "base_IRG_net > 0",
        then: [
          { if: "base_IRG_net <= 30000", set: "IRG = 0" },
          { if: "base_IRG_net > 30000 && base_IRG_net <= 120000", set: "IRG = (base_IRG_net - 30000) * 0.20" },
          { if: "base_IRG_net > 120000 && base_IRG_net <= 360000", set: "IRG = 18000 + (base_IRG_net - 120000) * 0.30" },
          { if: "base_IRG_net > 360000", set: "IRG = 90000 + (base_IRG_net - 360000) * 0.35" }
        ],
        justify: "Barème progressif 2026 : Exonération jusqu'à 30 000 DA."
      }, { merge: true });

      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_CNAS_PATRONALE"), {
        id: "RULE_CNAS_PATRONALE",
        code: "CNAS_PATRONALE",
        name: "Charges : CNAS Patronale (26%)",
        category: "SOCIAL",
        priority: 5,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: lawId,
        when: "salaire_brut > 0",
        then: [
          { set: "cotisation_patronale = salaire_brut * 0.26" },
          { set: "cout_total_employeur = salaire_brut + cotisation_patronale" }
        ],
        justify: "Charges sociales à la charge de l'employeur."
      }, { merge: true });

      toast({ title: "Noyau DSL 2026 (Fiscal & Paie) Opérationnel" });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Moteur Fiscal Master</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Industrial DSL & 2026 Compliance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleInitialize2026DSL} disabled={isInitializing} className="rounded-2xl bg-white border-slate-200 font-bold">
            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Réinitialiser DSL 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-1 border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl ring-1 ring-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
              <Beaker className="h-5 w-5 text-primary" /> Simulation Lab
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Test du pipeline de calcul</CardDescription>
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
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl shadow-lg" onClick={handleRunFullSimulation} disabled={isSimulating}>
              {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Exécuter Pipeline DSL
            </Button>
            
            {simResult && (
              <div className="pt-6 space-y-4 animate-in fade-in duration-300">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[9px] font-black text-primary uppercase mb-1">Impact Calculé</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-slate-900">
                      {simMode === "PAIE" ? (simResult.results.IRG || 0).toLocaleString() : (simResult.results.IBS || 0).toLocaleString()} DA
                    </span>
                    <Badge className="bg-primary text-white text-[8px] uppercase">{simMode === "PAIE" ? "IRG FINAL" : "IBS FINAL"}</Badge>
                  </div>
                  {simMode === "PAIE" && (
                    <div className="mt-2 text-[10px] font-bold text-slate-500 flex justify-between">
                       <span>Coût Total Employeur :</span>
                       <span>{Math.round(simResult.results.cout_total_employeur || 0).toLocaleString()} DA</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Traces d'Audit :</p>
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

        <div className="lg:col-span-2">
          <Tabs defaultValue="rules" className="w-full">
            <TabsList className="bg-slate-100 border border-slate-200 p-1.5 rounded-3xl h-auto mb-8">
              <TabsTrigger value="rules" className="rounded-2xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold"><Code2 className="h-4 w-4 mr-2" /> Pipeline DSL Actif</TabsTrigger>
              <TabsTrigger value="ai" className="rounded-2xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold"><Sparkles className="h-4 w-4 mr-2" /> IA Vision</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-6">
              {rules?.map((rule) => (
                <Card key={rule.id} className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-3xl border-l-4 border-l-primary group">
                  <CardHeader className="py-4 px-8 bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                          {rule.name}
                        </CardTitle>
                        {rule.category === 'SOCIAL' ? <Users className="h-3 w-3 text-blue-500" /> : <Banknote className="h-3 w-3 text-emerald-500" />}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Priorité: {rule.priority} • {rule.category}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black h-5">DSL 2026</Badge>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[10px] text-emerald-400 shadow-inner">
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
            </TabsContent>

            <TabsContent value="ai">
              <Card className="border-none shadow-xl bg-white rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter"><BrainCircuit className="h-5 w-5 text-primary" /> Extraction de Texte Officiel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="Collez ici un communiqué de la DGI ou un article de la Loi de Finances..." 
                    className="min-h-[250px] bg-slate-50 border-slate-200 text-xs rounded-2xl"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                  <Button className="w-full bg-primary h-12 rounded-2xl font-black uppercase tracking-widest text-[10px]" onClick={handleAiAnalysis} disabled={isAiProcessing}>
                    {isAiProcessing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Convertir en DSL Fiscal
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
