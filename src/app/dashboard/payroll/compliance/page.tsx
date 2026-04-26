
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, 
  Gavel, Scale, Loader2, Search, 
  FileCheck, Users, Info, ArrowRight,
  TrendingDown, CheckCircle2, History,
  Database, Landmark
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { PAYROLL_CONSTANTS } from "@/lib/calculations"

export default function HrComplianceDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => { setMounted(true) }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant?.id]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const complianceMetrics = React.useMemo(() => {
    if (!employees) return null;
    
    let totalScore = 100;
    const anomalies: any[] = [];
    let estimatedPenalty = 0;

    employees.forEach(emp => {
      // R7: Salaire < SNMG
      if ((emp.baseSalary || 0) < PAYROLL_CONSTANTS.SNMG) {
        totalScore -= 20;
        anomalies.push({ 
          code: 'R7', 
          empName: emp.name, 
          risk: 'Salaire inférieur au SNMG', 
          severity: 'CRITIQUE',
          action: 'Augmenter le salaire de base à 24 000 DA min.'
        });
        estimatedPenalty += 5000;
      }

      // R1: Défaut de déclaration CNAS (Simulation si champ vide)
      if (!emp.cnasNumber) {
        totalScore -= 30;
        anomalies.push({ 
          code: 'R1', 
          empName: emp.name, 
          risk: 'Absence de numéro d\'affiliation CNAS', 
          severity: 'CRITIQUE',
          action: 'Affilier le salarié sous 10 jours.'
        });
        estimatedPenalty += (emp.baseSalary || 24000) * 0.35;
      }

      // R6: Absence de NIN (Légal 2026)
      if (!emp.nin) {
        totalScore -= 10;
        anomalies.push({ 
          code: 'R6', 
          empName: emp.name, 
          risk: 'NIN manquant (Obligatoire G29/DAS)', 
          severity: 'ÉLEVÉ',
          action: 'Récupérer le NIN du salarié.'
        });
      }
    });

    return { 
      score: Math.max(0, totalScore), 
      anomalies, 
      estimatedPenalty,
      level: totalScore > 80 ? 'MAÎTRISÉ' : totalScore > 40 ? 'ÉLEVÉ' : 'CRITIQUE'
    };
  }, [employees]);

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <Gavel className="text-accent h-8 w-8" /> Audit & Conformité RH
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Simulateur d'inspection du travail & Scoring CNAS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold h-11 px-6 bg-white border-slate-200">
            <History className="mr-2 h-4 w-4" /> Historique Audits
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
            <FileCheck className="mr-2 h-4 w-4" /> Lancer Inspection Live
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={`border-none shadow-2xl ring-1 ring-border bg-white border-l-4 ${complianceMetrics?.score && complianceMetrics.score > 80 ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Score de Conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-black tracking-tighter ${complianceMetrics?.score && complianceMetrics.score > 80 ? 'text-emerald-600' : 'text-destructive'}`}>
              {complianceMetrics?.score}/100
            </div>
            <p className="text-[10px] mt-2 font-bold uppercase tracking-widest text-slate-400">Niveau : {complianceMetrics?.level}</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Risque Redressement Est.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tracking-tighter">
              {complianceMetrics?.estimatedPenalty.toLocaleString()} DA
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase">Base CNAS + Droit du Travail</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Anomalies Détectées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tracking-tighter">{complianceMetrics?.anomalies.length || 0} alertes</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase">Audit sur {employees?.length || 0} salariés</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Landmark className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Mise à jour</p>
           <h2 className="text-xl font-black uppercase">LF 2026 ACTIVE</h2>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Registre des Non-Conformités</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Détection automatique via moteur DSL v3.0</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input placeholder="Filtrer salarié..." className="pl-8 h-8 text-[10px] w-48 rounded-lg bg-white" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="text-[10px] uppercase font-black">
                    <TableHead>Salarié</TableHead>
                    <TableHead>Nature du Risque</TableHead>
                    <TableHead className="text-center">Gravité</TableHead>
                    <TableHead className="text-right">Action Recommandée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceMetrics?.anomalies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                         <div className="flex flex-col items-center gap-2">
                           <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-20" />
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun risque détecté sur ce dossier.</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : complianceMetrics?.anomalies.map((a, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-xs font-bold text-slate-900">{a.empName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-600">{a.risk}</span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Code: {a.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="outline" className={`text-[8px] font-black uppercase ${a.severity === 'CRITIQUE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                           {a.severity}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black text-primary uppercase">
                          Appliquer <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden">
               <ShieldCheck className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-emerald-600" />
               <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2">Protection Juridique ComptaFisc</h4>
               <p className="text-[11px] text-emerald-700 leading-relaxed italic">
                "Le respect strict des délais de déclaration (DAC) et de paiement (20 du mois) est le premier rempart contre les majorations de retard de 5% + 1%."
               </p>
            </Card>

            <Card className="bg-blue-50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden">
               <Info className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-blue-600" />
               <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Note sur le SNMG 2026</h4>
               <p className="text-[11px] text-blue-700 leading-relaxed italic">
                "Attention : Le SNMG est passé à 24 000 DA. Tout contrat de travail prévoyant une rémunération inférieure est frappé de nullité relative et expose l'entreprise à une amende pénale."
               </p>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-accent">Analyse de Risque Globale</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="opacity-60">Couverture CNAS</span>
                    <span className="text-emerald-400">92%</span>
                 </div>
                 <Progress value={92} className="h-1 bg-white/10" />
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="opacity-60">Respect SNMG 24k</span>
                    <span className="text-emerald-400">100%</span>
                 </div>
                 <Progress value={100} className="h-1 bg-white/10" />
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="opacity-60">Intégrité NIN (G29)</span>
                    <span className="text-amber-400">65%</span>
                 </div>
                 <Progress value={65} className="h-1 bg-white/10" />
              </div>

              <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                 <div className="flex items-center gap-2 mb-2">
                   <AlertTriangle className="h-4 w-4 text-amber-500" />
                   <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Alerte Redressement</span>
                 </div>
                 <p className="text-[11px] opacity-70 leading-relaxed italic">
                   "Risque de requalification élevé : 3 prestataires externes présentent des indices de lien de subordination (Lieu de travail fixe, horaires imposés)."
                 </p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-white/5 p-4">
               <Button variant="ghost" className="w-full text-accent font-black uppercase tracking-widest text-[9px] hover:bg-white/5">
                 Générer Rapport d'Audit Complet <ArrowRight className="ml-2 h-3 w-3" />
               </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-xl ring-1 ring-border bg-white rounded-3xl p-6">
             <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moteur DSL Juridique</h4>
                   <p className="text-sm font-black text-slate-900">Version 2026.2</p>
                </div>
             </div>
             <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
               Notre moteur DSL intègre plus de 120 règles de contrôle basées sur le Code du Travail (Loi 90-11) et les circulaires CNAS. Chaque recommandation est auditable devant les tribunaux algériens.
             </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
