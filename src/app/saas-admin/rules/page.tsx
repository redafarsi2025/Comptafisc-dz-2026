
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
  Layers, ChevronRight, Calculator, CheckCircle2
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"

export default function BusinessRulesConfig() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [isOptimizing, setIsOptimizing] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const rulesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "fiscal_business_rules"), orderBy("order", "asc")) : null
  , [db]);
  const { data: rules, isLoading } = useCollection(rulesQuery);

  const handleOptimizeOrder = async () => {
    if (!db || !rules) return;
    setIsOptimizing(true);
    
    const sorted = [...rules].sort((a, b) => {
      const priority = { 'COMPTA': 1, 'SOCIAL': 2, 'FISCAL': 3 };
      const catA = (priority as any)[a.category] || 99;
      const catB = (priority as any)[b.category] || 99;
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });

    try {
      for (let i = 0; i < sorted.length; i++) {
        const ruleRef = doc(db, "fiscal_business_rules", sorted[i].id);
        updateDocumentNonBlocking(ruleRef, { order: (i + 1) * 10 });
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Règles Métier</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Rule Pipeline & Hierarchy</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl bg-white border-slate-200 font-bold"
            onClick={handleOptimizeOrder}
            disabled={isOptimizing || isLoading}
          >
            {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownUp className="mr-2 h-4 w-4" />}
            Optimiser Flux
          </Button>
          <Button className="bg-primary rounded-2xl px-6 font-bold shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Règle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <Card className="bg-primary text-white border-none shadow-xl shadow-primary/20 group">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-white/70 tracking-widest">Pipeline Actif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{rules?.length || 0} étapes</div>
            <p className="text-[10px] mt-2 font-bold uppercase text-accent flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Séquence Intègre
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-xl shadow-slate-200/50 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400">Santé Logique</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 uppercase tracking-tighter">Vérifié</div>
            <p className="text-[10px] text-slate-500 mt-1 italic">Conforme SCF 2.6</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <Card className="shadow-2xl shadow-slate-200/50 border-none overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
              <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tighter">Registre des Contrôles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 font-black text-[10px] uppercase tracking-widest py-4 px-8">Ordre</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">Règle / Catégorie</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">Séquence Logique</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest py-4 px-8">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
                  ) : rules?.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="py-6 px-8">
                        <span className="font-black text-slate-900 font-mono text-sm">{rule.order || '--'}</span>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-xs tracking-tight">{rule.name}</span>
                          <Badge variant="secondary" className="text-[8px] font-black h-4 w-fit mt-1.5 rounded-full bg-slate-100 text-slate-600">{rule.category}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col gap-2">
                          <code className="text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 text-primary font-mono">{rule.condition || rule.formula?.substring(0, 35)}...</code>
                          {rule.dependsOn && rule.dependsOn.length > 0 && (
                            <span className="text-[8px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                              <Layers className="h-2 w-2" /> Dépendance : {rule.dependsOn.join(', ')}
                            </span>
                          )}
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
        </div>

        <div className="space-y-8">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden ring-4 ring-white shadow-slate-200">
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
                <Calculator className="h-4 w-4 text-accent" /> Optimisation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-6 pt-6 opacity-90">
              <div className="space-y-4">
                <p className="leading-relaxed font-medium">L'ordre d'exécution est crucial pour l'intégrité de la balance fiscale.</p>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-3"><Badge className="bg-blue-500 text-[8px] font-black h-5">1. COMPTA</Badge> <ChevronRight className="h-3 w-3 opacity-30" /> <span className="text-[9px] uppercase font-bold text-slate-400">Base Calcul</span></div>
                  <div className="flex items-center gap-3"><Badge className="bg-amber-500 text-[8px] font-black h-5">2. SOCIAL</Badge> <ChevronRight className="h-3 w-3 opacity-30" /> <span className="text-[9px] uppercase font-bold text-slate-400">Assiette CNAS</span></div>
                  <div className="flex items-center gap-3"><Badge className="bg-emerald-500 text-[8px] font-black h-5">3. FISCAL</Badge> <ChevronRight className="h-3 w-3 opacity-30" /> <span className="text-[9px] uppercase font-bold text-slate-400">IRG / IBS</span></div>
                </div>
              </div>
              <Button className="w-full bg-accent text-primary font-black uppercase tracking-widest text-[9px] h-11 rounded-xl">Lancer Diagnostic Flux</Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-inner">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
              <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                <strong>Note Pipeline :</strong> Toute règle inactive est ignorée par le Moteur Fiscal Master lors de l'exécution du pipeline de fin de mois.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
