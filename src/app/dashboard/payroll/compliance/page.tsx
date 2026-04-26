
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
  Database, Landmark, Save, X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSearchParams } from "next/navigation"
import { PAYROLL_CONSTANTS, calculateSalaireBase } from "@/lib/calculations"
import { toast } from "@/hooks/use-toast"

export default function HrComplianceDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  // Correction States
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

      // R7: Salaire < SNMG (Loi 90-11)
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

      // R1: Défaut de déclaration CNAS
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

      // R6: Absence de NIN (G29 Obligatoire)
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

  const filteredAnomalies = React.useMemo(() => {
    if (!complianceMetrics) return [];
    return complianceMetrics.anomalies.filter(a => 
      a.empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.risk.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complianceMetrics, searchTerm]);

  const dynamicAdvice = React.useMemo(() => {
    if (complianceMetrics.anomalies.length === 0) {
      return "Dossier 100% conforme. Vos données sont prêtes pour les déclarations DAS et G29 sans risque de rejet.";
    }
    const codes = complianceMetrics.anomalies.map(a => a.code);
    if (codes.includes('R7')) return "Priorité SNMG : La loi 90-11 sanctionne pénalement tout salaire inférieur à 24 000 DA. Régularisez les indices.";
    if (codes.includes('R1')) return "Risque CNAS : L'absence de numéro d'assurance suggère un travail non déclaré. Risque de redressement majeur.";
    if (codes.includes('R6')) return "Identité G29 : Le NIN est désormais obligatoire pour valider votre déclaration annuelle des salaires.";
    return "Consultez le registre pour corriger les anomalies détectées.";
  }, [complianceMetrics.anomalies]);

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
      toast({ title: "Conformité mise à jour", description: `La fiche de ${correctionData.name} a été corrigée.` });
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <Gavel className="text-accent h-8 w-8" /> Audit & Conformité RH
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Inspection virtuelle du travail (Noyau LF 2026)</p>
        </div>
        <div className="flex gap-2">
          <Badge className={`px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-sm ${complianceMetrics.score > 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <ShieldCheck className="h-3 w-3 mr-2" /> Santé Sociale : {complianceMetrics.level}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Indice de Conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-black tracking-tighter ${complianceMetrics.score > 85 ? 'text-emerald-600' : 'text-primary'}`}>
              {complianceMetrics.score}%
            </div>
            <Progress value={complianceMetrics.score} className="h-1.5 mt-3" />
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Risque Redressement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tracking-tighter">
              {Math.round(complianceMetrics.estimatedPenalty).toLocaleString()} DA
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tight">Estimation amendes & rappels</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contrats Audités</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tracking-tighter">{employees?.length || 0} fiches</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Couverture base complète</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Landmark className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Moteur Fiscal</p>
           <h2 className="text-xl font-black uppercase">LF 2026 ACTIVE</h2>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Registre Réel des Non-Conformités</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Anomalies actives détectées par le noyau d'audit</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  placeholder="Chercher salarié..." 
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
                    <TableHead>Salarié Audité</TableHead>
                    <TableHead>Nature de l'Écart</TableHead>
                    <TableHead className="text-center">Gravité</TableHead>
                    <TableHead className="text-right">Action Requise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnomalies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                         <div className="flex flex-col items-center gap-2">
                           <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                             <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                           </div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucune anomalie détectée sur ce dossier.</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAnomalies.map((a, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 transition-colors group">
                      <TableCell className="text-xs font-bold text-slate-900">{a.empName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-600">{a.risk}</span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Code Erreur: {a.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="outline" className={`text-[8px] font-black uppercase ${a.severity === 'CRITIQUE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                           {a.severity}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[9px] font-black text-primary hover:bg-primary/10 uppercase"
                          onClick={() => handleOpenCorrection(a)}
                        >
                          Corriger <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-accent">Analyse de Risque Globale (Réelle)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="opacity-60">Couverture CNAS</span>
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
                    <span className="opacity-60">Intégrité NIN (G29/DAS)</span>
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
                   {dynamicAdvice}
                 </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden shadow-inner">
             <ShieldCheck className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-emerald-600" />
             <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
               <ShieldCheck className="h-4 w-4" /> Certification Algérie
             </h4>
             <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              "L'exactitude des identifiants (NIN/CNAS) garantit la télé-déclaration sans erreur sur Damancom et Jibayatic. Le respect du SNMG vous protège des sanctions de l'inspection du travail."
             </p>
          </Card>
        </div>
      </div>

      {/* CORRECTION DIALOG */}
      <Dialog open={isCorrectionDialogOpen} onOpenChange={setIsCorrectionDialogOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-accent/20 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-accent" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Corriger la Non-Conformité</DialogTitle>
                <DialogDescription className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Correction manuelle assistée par Noyau LF 2026</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
             <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Écart détecté pour : {correctionData.name}</p>
                <p className="text-xs text-amber-700 italic">"{selectedAnomaly?.risk}" — {selectedAnomaly?.action}</p>
             </div>

             <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <Label className={`text-[10px] font-black uppercase tracking-widest ${selectedAnomaly?.code === 'R7' ? 'text-primary' : 'text-slate-400'}`}>
                    Indice du poste (Ajuster pour SNMG)
                  </Label>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      type="number" 
                      className={`pl-10 h-12 rounded-xl text-lg font-black ${selectedAnomaly?.code === 'R7' ? 'border-primary bg-primary/5' : ''}`}
                      value={correctionData.indice || ""}
                      onChange={e => setCorrectionData({...correctionData, indice: parseInt(e.target.value) || 0})}
                    />
                    <div className="absolute right-3 top-2.5 flex flex-col items-end">
                      <span className="text-[8px] font-bold uppercase text-slate-400 leading-none">S. Base :</span>
                      <span className={`text-xs font-black ${currentSBase < 24000 ? 'text-destructive' : 'text-emerald-600'}`}>{currentSBase.toLocaleString()} DA</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className={`text-[10px] font-black uppercase tracking-widest ${selectedAnomaly?.code === 'R6' ? 'text-primary' : 'text-slate-400'}`}>
                      Identifiant NIN (18 chiffres)
                    </Label>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        className={`pl-10 h-10 rounded-xl font-mono text-xs ${selectedAnomaly?.code === 'R6' ? 'border-primary bg-primary/5' : ''}`}
                        value={correctionData.nin || ""}
                        onChange={e => setCorrectionData({...correctionData, nin: e.target.value})}
                        maxLength={18}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className={`text-[10px] font-black uppercase tracking-widest ${selectedAnomaly?.code === 'R1' ? 'text-primary' : 'text-slate-400'}`}>
                      N° Assurance (CNAS)
                    </div>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        className={`pl-10 h-10 rounded-xl font-mono text-xs ${selectedAnomaly?.code === 'R1' ? 'border-primary bg-primary/5' : ''}`}
                        value={correctionData.cnasNumber || ""}
                        onChange={e => setCorrectionData({...correctionData, cnasNumber: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
             </div>
          </div>

          <DialogFooter className="bg-slate-50 p-6 border-t gap-3">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsCorrectionDialogOpen(false)}>Annuler</Button>
            <Button className="bg-primary flex-1 shadow-xl h-12 rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={handleSaveCorrection} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Appliquer la Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
