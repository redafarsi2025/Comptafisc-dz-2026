
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
  Settings2, Activity, Zap, Info
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
  const [simResult, setSimResult] = React.useState<any>(null)
  const [isSimulating, setIsSimulating] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const rulesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_business_rules"), orderBy("priority", "asc")) : null, [db]);
  const { data: rules } = useCollection(rulesQuery);

  const handleRunFullSimulation = async () => {
    if (!db) return;
    setIsSimulating(true);
    try {
      const input = simMode === "PAIE" 
        ? { salaire_brut: parseFloat(simBase) }
        : { resultat_fiscal: parseFloat(simBase), montant_certifie: parseFloat(simBase) };

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
      // 1. RÈGLE IBS SECTORIELLE (Isolation ACTIVITÉ)
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_IBS_2026"), {
        id: "RULE_IBS_2026",
        code: "IBS_TAUX",
        name: "IBS : Taux Différenciés 2026",
        category: "FISCAL",
        priority: 100,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: "LF_2026",
        when: "regime == 'REGIME_REEL'",
        then: [
          { if: "secteur == 'PRODUCTION'", set: "taux_IBS = 0.19" },
          { if: "secteur == 'BTP'", set: "taux_IBS = 0.23" },
          { if: "secteur == 'SERVICES'", set: "taux_IBS = 0.26" },
          { set: "IBS = MAX(10000, resultat_fiscal * taux_IBS)" }
        ],
        justify: "Art. 150 CIDTA - Taux différenciés par secteur d'activité."
      }, { merge: true });

      // 2. RÈGLE RETENUE BTP (Isolation ACTIVITÉ)
      await setDocumentNonBlocking(doc(db, "fiscal_business_rules", "RULE_BTP_RETENUE"), {
        id: "RULE_BTP_RETENUE",
        code: "RETENUE_BTP",
        name: "BTP : Retenue de Garantie",
        category: "COMPTA",
        priority: 50,
        active: true,
        effectiveStartDate: "2026-01-01",
        sourceLawId: "LF_2026",
        when: "secteur == 'BTP'",
        then: [
          { set: "retenue = montant_certifie * 0.05" }
        ],
        justify: "Retenue légale de 5% sur situations de travaux."
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
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Global Governance & Dynamic Rules Engine</p>
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
              <Beaker className="h-5 w-5 text-primary" /> Jumeau Numérique
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Simulation de la cascade hiérarchique</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">1. Profil Client (Isolation)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={simSector} onValueChange={setSimSector}>
                    <SelectTrigger className="h-9 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCTION">🏭 INDUSTRIE</SelectItem>
                      <SelectItem value="BTP">🏗 BTP</SelectItem>
                      <SelectItem value="SERVICES">💼 SERVICES</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={simRegime} onValueChange={setSimRegime}>
                    <SelectTrigger className="h-9 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGIME_REEL">RÉEL</SelectItem>
                      <SelectItem value="IFU">IFU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">2. Type de calcul (Document)</Label>
                <Select value={simMode} onValueChange={setSimMode}>
                  <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IBS">IBS (Sociétés)</SelectItem>
                    <SelectItem value="PAIE">Paie (Sociaux)</SelectItem>
                    <SelectItem value="SITUATION">BTP (Situations)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">3. Assiette de base (DA)</Label>
                <Input type="number" value={simBase} onChange={e => setSimBase(e.target.value)} className="h-12 text-xl font-black rounded-xl border-primary/20 bg-primary/5 text-primary" />
              </div>
            </div>

            <Button className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] h-14 rounded-2xl shadow-xl shadow-slate-200" onClick={handleRunFullSimulation} disabled={isSimulating}>
              {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Exécuter Pipeline Master
            </Button>
            
            {simResult && (
              <div className="pt-6 space-y-4 animate-in fade-in duration-500">
                <div className="p-6 bg-slate-900 text-white rounded-3xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit className="h-12 w-12" /></div>
                  <p className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-1">Calcul Master Node</p>
                  <div className="text-3xl font-black tracking-tighter">
                    {simMode === "PAIE" ? (simResult.results.IRG || 0).toLocaleString() : 
                     simMode === "SITUATION" ? (simResult.results.retenue || 0).toLocaleString() :
                     (simResult.results.IBS || 0).toLocaleString()} <span className="text-sm font-normal opacity-50">DA</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Activity className="h-3 w-3 text-emerald-500" /> Audit Trail (DSL History)
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {simResult.traces.map((t: any, i: number) => (
                      <div key={i} className="text-[10px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-slate-900 uppercase">{t.ruleCode}</span>
                          <Badge variant="outline" className="text-[8px] bg-white">v3.0</Badge>
                        </div>
                        <p className="text-slate-500 italic mb-2">"{t.justification}"</p>
                        <div className="flex flex-wrap gap-1">
                           {t.actionsExecuted.map((a: string, j: number) => <span key={j} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-mono text-[8px]">{a}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 relative overflow-hidden">
                <ShieldCheck className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-emerald-600" />
                <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Gouvernance Versionnée
                </h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                  Le système ne stocke plus aucun taux statique. Chaque variable est liée à une loi de finances et une date d'effet. La traçabilité est garantie pour le commissariat aux comptes.
                </p>
              </Card>

              <Card className="bg-blue-50 border border-blue-100 rounded-3xl p-6 relative overflow-hidden">
                <Settings2 className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-blue-600" />
                <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Moteur Déclaratif
                </h4>
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  Le code applicatif ne connaît plus la loi. Il interroge simplement le noyau via des variables d'entrée. Cela permet des mises à jour à chaud sans interruption de service.
                </p>
              </Card>
           </div>

           <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <DatabaseZap className="h-6 w-6 text-primary" /> Registre des Règles Actives
              </h3>
              {rules?.map((rule) => (
                <Card key={rule.id} className="border-none shadow-xl bg-white rounded-3xl border-l-4 border-l-primary overflow-hidden group hover:translate-x-1 transition-all">
                  <CardHeader className="py-5 px-8 bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter">{rule.name}</CardTitle>
                        <Badge className="bg-primary/10 text-primary text-[8px] font-black uppercase border-none">{rule.category}</Badge>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Source : {rule.sourceLawId} • Priorité {rule.priority}</p>
                    </div>
                    <Switch checked={rule.active} onCheckedChange={() => {}} />
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[10px] text-emerald-400 shadow-inner">
                      <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold border-b border-white/5 pb-2">
                        <span className="bg-blue-900/50 px-2 py-0.5 rounded">IF</span>
                        <span>{rule.when || "TRUE"}</span>
                      </div>
                      <div className="space-y-2 pl-4 border-l border-white/10">
                        {Array.isArray(rule.then) ? rule.then.map((t: any, i: number) => (
                          <p key={i} className="opacity-90 flex gap-2">
                            <span className="text-slate-500">THEN</span> 
                            <span>{t.set}</span>
                            {t.if && <span className="text-blue-300 italic opacity-60">if({t.if})</span>}
                          </p>
                        )) : (
                          <p className="opacity-90 flex gap-2"><span className="text-slate-500">THEN</span> {rule.code} = {rule.formula}</p>
                        )}
                      </div>
                      <p className="mt-6 text-slate-400 italic border-t border-white/5 pt-4 flex items-start gap-2">
                        <Gavel className="h-3 w-3 mt-0.5 shrink-0" />
                        JUSTIFICATION : "{rule.justify}"
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
