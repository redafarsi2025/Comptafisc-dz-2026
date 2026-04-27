"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
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
  Database, Landmark, Save, X, Calculator
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSearchParams } from "next/navigation"
import { PAYROLL_CONSTANTS, calculateSalaireBase } from "@/lib/calculations"
import { toast } from "@/hooks/use-toast"

/**
 * @fileOverview Intelligence Déterministe RH : Audit automatique des contrats.
 */

export default function HrComplianceDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  const [isCorrectionDialogOpen, setIsCorrectionDialogOpen] = React.useState(false)
  const [selectedAnomaly, setSelectedAnomaly] = React.useState<any>(null)
  const [correctionData, setCorrectionData] = React.useState<any>({})
  const [isSaving, setIsSaving] = React.useState(false)

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

    const valPoint = currentTenant?.iepPointValue || PAYROLL_CONSTANTS.DEFAULT_VALEUR_POINT;

    employees.forEach(emp => {
      const sBase = calculateSalaireBase(emp.indice || 0, valPoint);
      const isLowSalary = sBase < PAYROLL_CONSTANTS.SNMG;
      const noCnas = !emp.cnasNumber;
      const noNin = !emp.nin;

      if (!isLowSalary) snmgCount++;
      if (!noCnas) cnasCount++;
      if (!noNin) ninCount++;

      if (isLowSalary) {
        totalScore -= (25 / employees.length);
        anomalies.push({ 
          code: 'R7', 
          empId: emp.id,
          empName: emp.name, 
          risk: `Salaire (${sBase.toLocaleString()} DA) < SNMG`, 
          severity: 'CRITIQUE',
          action: 'Ajuster l\'indice pour atteindre 24 000 DA.',
          employee: emp
        });
        estimatedPenalty += 15000; 
      }

      if (noCnas) {
        totalScore -= (15 / employees.length);
        anomalies.push({ 
          code: 'R1', 
          empId: emp.id,
          empName: emp.name, 
          risk: 'Absence d\'affiliation CNAS', 
          severity: 'CRITIQUE',
          action: 'Renseigner le n° d\'assurance sociale.',
          employee: emp
        });
        estimatedPenalty += (sBase * 0.35); 
      }

      if (noNin) {
        totalScore -= (10 / employees.length);
        anomalies.push({ 
          code: 'R6', 
          empId: emp.id,
          empName: emp.name, 
          risk: 'NIN manquant (Rejet G29)', 
          severity: 'ÉLEVÉ',
          action: 'Récupérer l\'identité biométrique.',
          employee: emp
        });
        estimatedPenalty += 2000; 
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
      level: totalScore > 85 ? 'MAÎTRISÉ' : totalScore > 50 ? 'ÉLEVÉ' : 'CRITIQUE',
      stats
    };
  }, [employees, currentTenant]);

  const handleOpenCorrection = (anomaly: any) => {
    setSelectedAnomaly(anomaly);
    setCorrectionData({ ...anomaly.employee });
    setIsCorrectionDialogOpen(true);
  };

  const handleSaveCorrection = async () => {
    if (!db || !currentTenant || !correctionData.id) return;
    setIsSaving(true);
    try {
      const empRef = doc(db, "tenants", currentTenant.id, "employees", correctionData.id);
      await updateDocumentNonBlocking(empRef, {
        ...correctionData,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Fiche corrigée" });
      setIsCorrectionDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  const valPoint = currentTenant?.iepPointValue || PAYROLL_CONSTANTS.DEFAULT_VALEUR_POINT;
  const currentSBase = calculateSalaireBase(correctionData.indice || 0, valPoint);

  return (
    <div className="space-y-8 pb-20 text-start">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <Gavel className="text-accent h-8 w-8" /> Intelligence RH
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Audit automatique des contrats (Noyau LF 2026)</p>
        </div>
        <Badge className={cn("px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-sm", complianceMetrics.score > 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          Score de Santé : {complianceMetrics.score}/100
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Couverture CNAS</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-3xl font-black text-primary">{Math.round(complianceMetrics.stats.cnasRate)}%</div>
            <Progress value={complianceMetrics.stats.cnasRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Risque Amendes</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-3xl font-black text-amber-600">{Math.round(complianceMetrics.estimatedPenalty).toLocaleString()} DA</div>
            <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">Simulation redressement</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Respect SNMG</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-3xl font-black text-blue-600">{Math.round(complianceMetrics.stats.snmgRate)}%</div>
            <Progress value={complianceMetrics.stats.snmgRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Moteur Expert</p>
           <h2 className="text-xl font-black uppercase">DÉTERMINISTE</h2>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
           <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Registre des Anomalies Contractuelles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead className="pl-6">Salarié</TableHead>
                <TableHead>Nature de l'Écart</TableHead>
                <TableHead className="text-center">Gravité</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complianceMetrics.anomalies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground">Aucune anomalie détectée.</TableCell></TableRow>
              ) : complianceMetrics.anomalies.map((a, i) => (
                <TableRow key={i} className="h-16 hover:bg-slate-50 transition-colors">
                  <TableCell className="pl-6 font-bold text-xs">{a.empName}</TableCell>
                  <TableCell className="text-xs font-medium text-slate-600">{a.risk}</TableCell>
                  <TableCell className="text-center">
                     <Badge variant="outline" className={cn("text-[8px] font-black uppercase", a.severity === 'CRITIQUE' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                       {a.severity}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-primary uppercase" onClick={() => handleOpenCorrection(a)}>
                      Corriger <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCorrectionDialogOpen} onOpenChange={setIsCorrectionDialogOpen}>
        <DialogContent className="max-w-xl p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">Corriger l'Indice de Poste</DialogTitle>
            <DialogDescription className="text-white/60 text-[10px] font-bold uppercase">Correction assistée par Noyau LF 2026</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 text-start">
             <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nouvel Indice (Calcul SNMG auto)</Label>
                <div className="relative">
                  <Calculator className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="number" 
                    className="pl-10 h-12 rounded-xl text-lg font-black"
                    value={correctionData.indice || ""}
                    onChange={e => setCorrectionData({...correctionData, indice: parseInt(e.target.value) || 0})}
                  />
                  <div className="absolute right-3 top-2.5 flex flex-col items-end">
                    <span className="text-[8px] font-bold uppercase text-slate-400">S. Base :</span>
                    <span className={cn("text-xs font-black", currentSBase < 24000 ? 'text-red-500' : 'text-emerald-600')}>{currentSBase.toLocaleString()} DA</span>
                  </div>
                </div>
             </div>
             <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">N° Sécurité Sociale (CNAS)</Label>
                <Input value={correctionData.cnasNumber || ""} onChange={e => setCorrectionData({...correctionData, cnasNumber: e.target.value})} className="h-10 rounded-xl font-mono" />
             </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t">
            <Button className="bg-primary w-full h-12 rounded-xl font-black uppercase text-[10px]" onClick={handleSaveCorrection} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Appliquer la Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
