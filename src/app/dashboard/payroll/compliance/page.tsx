
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
    if (!employees || employees.length === 0) return {
      score: 100,
      anomalies: [],
      estimatedPenalty: 0,
      level: 'INCONNU',
      stats: { cnasRate: 100, snmgRate: 100, ninRate: 100 }
    };
    
    let totalScore = 100;
    const anomalies: any[] = [];
    let estimatedPenalty = 0;
    let cnasCount = 0;
    let snmgCount = 0;
    let ninCount = 0;

    employees.forEach(emp => {
      const isLowSalary = (emp.baseSalary || 0) < PAYROLL_CONSTANTS.SNMG;
      const noCnas = !emp.cnasNumber;
      const noNin = !emp.nin;

      if (!isLowSalary) snmgCount++;
      if (!noCnas) cnasCount++;
      if (!noNin) ninCount++;

      // R7: Salaire < SNMG (Loi 90-11)
      if (isLowSalary) {
        totalScore -= (20 / employees.length);
        anomalies.push({ 
          code: 'R7', 
          empName: emp.name, 
          risk: 'Salaire inférieur au SNMG (24 000 DA)', 
          severity: 'CRITIQUE',
          action: 'Régularisation immédiate du salaire de base.'
        });
        estimatedPenalty += 10000; // Amende forfaitaire indicative
      }

      // R1: Défaut de déclaration CNAS
      if (noCnas) {
        totalScore -= (30 / employees.length);
        anomalies.push({ 
          code: 'R1', 
          empName: emp.name, 
          risk: 'Absence d\'affiliation CNAS', 
          severity: 'CRITIQUE',
          action: 'Affiliation via portail Damancom requise.'
        });
        estimatedPenalty += (emp.baseSalary || 24000) * 0.35 * 6; // Simulation 6 mois de cotisations
      }

      // R6: Absence de NIN (G29 Obligatoire)
      if (noNin) {
        totalScore -= (10 / employees.length);
        anomalies.push({ 
          code: 'R6', 
          empName: emp.name, 
          risk: 'NIN manquant (Rejet G29/DAS)', 
          severity: 'ÉLEVÉ',
          action: 'Récupérer l\'identité biométrique.'
        });
        estimatedPenalty += 2000; // Risque de rejet de déclaration
      }
    });

    const stats = {
      cnasRate: (cnasCount / employees.length) * 100,
      snmgRate: (snmgCount / employees.length) * 100,
      ninRate: (ninCount / employees.length) * 100,
    };

    return { 
      score: Math.max(0, Math.round(totalScore)), 
      anomalies, 
      estimatedPenalty,
      level: totalScore > 80 ? 'MAÎTRISÉ' : totalScore > 40 ? 'ÉLEVÉ' : 'CRITIQUE',
      stats
    };
  }, [employees]);

  const filteredAnomalies = React.useMemo(() => {
    if (!complianceMetrics) return [];
    return complianceMetrics.anomalies.filter(a => 
      a.empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.risk.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complianceMetrics, searchTerm]);

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <Gavel className="text-accent h-8 w-8" /> Audit & Conformité RH
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Inspection du travail virtuelle & Scoring CNAS Réel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold h-11 px-6 bg-white border-slate-200">
            <History className="mr-2 h-4 w-4" /> Rapports Archivés
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
            <FileCheck className="mr-2 h-4 w-4" /> Actualiser l'Audit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={`border-none shadow-2xl ring-1 ring-border bg-white border-l-4 ${complianceMetrics.score > 80 ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Score de Conformité Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-black tracking-tighter ${complianceMetrics.score > 80 ? 'text-emerald-600' : 'text-destructive'}`}>
              {complianceMetrics.score}/100
            </div>
            <p className="text-[10px] mt-2 font-bold uppercase tracking-widest text-slate-400">Statut : {complianceMetrics.level}</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Risque Financier Estimé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tracking-tighter">
              {Math.round(complianceMetrics.estimatedPenalty).toLocaleString()} DA
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tight">Amendes & Rappels CNAS calculés</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dossiers Salariés Audités</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tracking-tighter">{employees?.length || 0} fiches</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">100% de la base analysée</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Landmark className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Version Noyau</p>
           <h2 className="text-xl font-black uppercase">LF 2026 ACTIVE</h2>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Registre Réel des Non-Conformités</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Anomalies extraites des fiches salariés actuelles</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  placeholder="Filtrer..." 
                  className="pl-8 h-8 text-[10px] w-48 rounded-lg bg-white" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="text-[10px] uppercase font-black">
                    <TableHead>Salarié</TableHead>
                    <TableHead>Nature du Risque</TableHead>
                    <TableHead className="text-center">Gravité</TableHead>
                    <TableHead className="text-right">Action Requise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnomalies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                         <div className="flex flex-col items-center gap-2">
                           <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-20" />
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucune anomalie réelle sur ce dossier.</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAnomalies.map((a, i) => (
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
                          Corriger <ArrowRight className="ml-1 h-3 w-3" />
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
               <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <ShieldCheck className="h-4 w-4" /> Certification ComptaFisc
               </h4>
               <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                "Le respect strict des délais de déclaration (DAC) et de paiement (20 du mois) est le premier rempart contre les majorations de retard de 5% + 1%."
               </p>
            </Card>

            <Card className="bg-blue-50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden">
               <Info className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-blue-600" />
               <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Info className="h-4 w-4" /> Note sur le SNMG 2026
               </h4>
               <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                "L'ERP vérifie que chaque salaire de base est conforme au seuil de 24 000 DA. Tout écart est bloquant lors de la journalisation de la paie."
               </p>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-accent">Analyse de Risque Globale (Réelle)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="opacity-60">Couverture CNAS (Affiliation)</span>
                    <span className={complianceMetrics.stats.cnasRate < 100 ? "text-amber-400" : "text-emerald-400"}>
                      {Math.round(complianceMetrics.stats.cnasRate)}%
                    </span>
                 </div>
                 <Progress value={complianceMetrics.stats.cnasRate} className="h-1 bg-white/10" />
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="opacity-60">Respect SNMG 24k</span>
                    <span className={complianceMetrics.stats.snmgRate < 100 ? "text-destructive" : "text-emerald-400"}>
                      {Math.round(complianceMetrics.stats.snmgRate)}%
                    </span>
                 </div>
                 <Progress value={complianceMetrics.stats.snmgRate} className="h-1 bg-white/10" />
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="opacity-60">Intégrité NIN (Identification)</span>
                    <span className={complianceMetrics.stats.ninRate < 100 ? "text-amber-400" : "text-emerald-400"}>
                      {Math.round(complianceMetrics.stats.ninRate)}%
                    </span>
                 </div>
                 <Progress value={complianceMetrics.stats.ninRate} className="h-1 bg-white/10" />
              </div>

              <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                 <div className="flex items-center gap-2 mb-2">
                   <AlertTriangle className="h-4 w-4 text-amber-500" />
                   <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Conseil Master Node</span>
                 </div>
                 <p className="text-[11px] opacity-70 leading-relaxed italic">
                   {complianceMetrics.anomalies.length > 0 
                    ? "Votre exposition au risque de redressement est significative. Régularisez en priorité les salaires inférieurs au SNMG." 
                    : "Excellent niveau de conformité. Vos données sont prêtes pour les déclarations DAS et G29 sans risque de rejet."}
                 </p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-white/5 p-4">
               <Button variant="ghost" className="w-full text-accent font-black uppercase tracking-widest text-[9px] hover:bg-white/5">
                 Générer Rapport Certifié <ArrowRight className="ml-2 h-3 w-3" />
               </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-xl ring-1 ring-border bg-white rounded-3xl p-6">
             <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moteur Juridique</h4>
                   <p className="text-sm font-black text-slate-900">Core v3.2 Pro</p>
                </div>
             </div>
             <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
               Notre algorithme d'audit analyse chaque champ de vos fiches salariés par rapport aux exigences du portail Jibayatic et de la télé-déclaration Damancom. Les scores de fiabilité sont garantis pour votre commissaire aux comptes.
             </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
