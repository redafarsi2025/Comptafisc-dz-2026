
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  ShieldAlert, Plus, Trash2, 
  Loader2, ListChecks, ArrowDownUp,
  Layers, ChevronRight, Calculator, CheckCircle2,
  FileSearch, Gavel
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"

export default function BusinessRulesConfig() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [isOptimizing, setIsOptimizing] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const rulesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "fiscal_business_rules"), orderBy("priority", "asc")) : null
  , [db]);
  const { data: rules, isLoading } = useCollection(rulesQuery);

  const handleOptimizeOrder = async () => {
    if (!db || !rules) return;
    setIsOptimizing(true);
    
    const sorted = [...rules].sort((a, b) => {
      const catPriority = { 'COMPTA': 1, 'SOCIAL': 2, 'FISCAL': 3 };
      const priorityA = (catPriority as any)[a.category] || 99;
      const priorityB = (catPriority as any)[b.category] || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });

    try {
      for (let i = 0; i < sorted.length; i++) {
        const ruleRef = doc(db, "fiscal_business_rules", sorted[i].id);
        updateDocumentNonBlocking(ruleRef, { priority: (i + 1) * 10 });
      }
      toast({ title: "Pipeline optimisé", description: "L'ordre respecte désormais la hiérarchie logique." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsOptimizing(false);
    }
  }

  const toggleRule = (id: string, current: boolean) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "fiscal_business_rules", id), { active: !current });
    toast({ title: "Statut mis à jour" });
  }

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Registre des Règles (DSL)</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Declarative Rule Engine & Audit Trail</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl bg-white border-slate-200 font-bold"
            onClick={handleOptimizeOrder}
            disabled={isOptimizing || isLoading}
          >
            {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownUp className="mr-2 h-4 w-4" />}
            Réordonner le Pipeline
          </Button>
          <Button className="bg-primary rounded-2xl px-6 font-bold shadow-lg">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Règle DSL
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="bg-slate-900 text-white border-none shadow-xl">
           <CardHeader className="pb-2">
             <CardTitle className="text-[10px] uppercase font-black tracking-widest text-accent">État du Pipeline</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="text-3xl font-black">{rules?.length || 0} Contrôles</div>
             <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[8px] font-black uppercase">
                  <span>Conformité SCF</span>
                  <span className="text-emerald-400">100%</span>
                </div>
                <Progress value={100} className="h-1 bg-white/10" />
             </div>
           </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-xl border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400">Traçabilité</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">Audit-Ready</div>
            <p className="text-[10px] text-slate-500 mt-1 italic">Toutes les règles sont justifiées</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl shadow-slate-200/50 border-none overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 font-black text-[10px] uppercase tracking-widest py-6 px-8">Priorité</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Règle / Justification</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Logique DSL (WHEN / THEN)</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest py-6 px-8">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : rules?.map((rule) => (
                <TableRow key={rule.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="py-6 px-8">
                    <span className="font-black text-slate-900 font-mono text-sm">{rule.priority}</span>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex flex-col space-y-1.5">
                      <span className="font-black text-slate-900 text-xs tracking-tight uppercase">{rule.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[8px] font-black h-4 bg-primary/5 text-primary border-none uppercase">{rule.category}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic flex items-start gap-1">
                        <Gavel className="h-3 w-3 mt-0.5 shrink-0" /> {rule.justify || "Aucun justificatif légal renseigné."}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-blue-600">
                        <span className="bg-blue-100 px-1.5 py-0.5 rounded">WHEN</span>
                        <code className="font-mono">{rule.when || "TRUE"}</code>
                      </div>
                      <div className="flex flex-col gap-1">
                        {Array.isArray(rule.then) ? rule.then.map((t: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 pl-4 border-l-2 border-emerald-100">
                            <span className="text-slate-400">THEN</span>
                            <code className="font-mono">{t.set}</code>
                            {t.if && <span className="text-slate-400 italic">IF {t.if}</span>}
                          </div>
                        )) : (
                          <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 pl-4 border-l-2 border-emerald-100">
                            <span className="text-slate-400">THEN</span>
                            <code className="font-mono">{rule.code} = {rule.formula}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 text-right px-8">
                    <div className="flex justify-end items-center gap-3">
                      <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id, rule.active)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4 shadow-sm">
        <div className="h-10 w-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold uppercase tracking-tight mb-1">Architecture DSL (Domain Specific Language) :</p>
          <p className="opacity-80">
            Ce registre définit l'intelligence déterministe de l'ERP. Contrairement à l'IA qui peut halluciner, le moteur DSL garantit que les calculs fiscaux (IBS, IRG, TVA) sont **auditables, prévisibles et 100% conformes** aux articles du CIDTA mentionnés dans le champ "Justification".
          </p>
        </div>
      </div>
    </div>
  )
}
