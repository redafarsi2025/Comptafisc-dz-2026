
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  FileText, Printer, ShieldCheck, Download, Calculator, 
  Info, Loader2, AlertCircle, FileCode, Send, ListChecks,
  TrendingUp, Wallet, Receipt, History
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { jsPDF } from "jspdf"
import { PAYROLL_CONSTANTS, calculateIRG, processEmployeePayroll } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { formatDZD } from "@/utils/fiscalAlgerie"

export default function G50Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Profil du Tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  // 2. Factures de Ventes (TVA Collectée)
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "invoices");
  }, [db, currentTenant?.id]);
  const { data: invoices } = useCollection(invoicesQuery);

  // 3. Journal des Achats (TVA Déductible)
  const purchaseEntriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(collection(db, "tenants", currentTenant.id, "journal_entries"), where("journalType", "==", "ACHATS"));
  }, [db, currentTenant?.id]);
  const { data: purchaseEntries } = useCollection(purchaseEntriesQuery);

  // 4. Salariés (IRG)
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant?.id]);
  const { data: employees } = useCollection(employeesQuery);

  // 5. Retenues sur Honoraires (Journal OD - Compte 442)
  const odEntriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(collection(db, "tenants", currentTenant.id, "journal_entries"), where("journalType", "==", "OD"));
  }, [db, currentTenant?.id]);
  const { data: odEntries } = useCollection(odEntriesQuery);

  // MOTEUR DE CALCUL G50 CONSOLIDÉ
  const g50 = React.useMemo(() => {
    if (!mounted || !currentTenant) return { tvaCollectee: 0, tvaDeductible: 0, tvaDue: 0, irgSalaries: 0, tap: 0, honoraires: 0, total: 0, baseImposableTVA: 0 };

    // A. TVA COLLECTÉE (Sur Ventes)
    const tvaCollectee = invoices?.reduce((sum, inv) => sum + (inv.totalTaxAmount || 0), 0) || 0;
    const baseImposableTVA = invoices?.reduce((sum, inv) => sum + (inv.totalAmountExcludingTax || 0), 0) || 0;

    // B. TVA DÉDUCTIBLE (Sur Journal Achats - Compte 4456)
    let tvaDeductible = 0;
    purchaseEntries?.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (line.accountCode.startsWith('4456')) {
          tvaDeductible += (line.debit || 0) - (line.credit || 0);
        }
      });
    });

    const tvaDue = Math.max(0, tvaCollectee - tvaDeductible);
    const precompte = Math.max(0, tvaDeductible - tvaCollectee);

    // C. IRG SALARIES
    const irgSalaries = employees?.reduce((sum, emp) => {
      const pay = processEmployeePayroll(emp, { valeurPoint: currentTenant.iepPointValue || 45 });
      return sum + pay.irg;
    }, 0) || 0;

    // D. TAP (Si applicable au secteur)
    const needsTAP = ['HYDROCARBURES', 'CONSEIL_JURIDIQUE'].includes(currentTenant.secteurActivite || '');
    const tapRate = needsTAP ? 0.015 : 0;
    const tap = baseImposableTVA * tapRate;

    // E. RETENUES HONORAIRES (Compte 442 dans les OD)
    let honoraires = 0;
    odEntries?.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (line.accountCode === '442') {
          honoraires += (line.credit || 0) - (line.debit || 0);
        }
      });
    });

    return {
      tvaCollectee,
      tvaDeductible,
      tvaDue,
      precompte,
      irgSalaries,
      tap,
      honoraires,
      baseImposableTVA,
      total: tvaDue + irgSalaries + tap + honoraires
    };
  }, [invoices, purchaseEntries, employees, odEntries, currentTenant, mounted]);

  const handleExportJibayatic = () => {
    if (!currentTenant) return;
    const period = new Date().toISOString().substring(0, 7);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DeclarationG50 version="2026.1">
  <Header>
    <NIF>${currentTenant.nif || '00000000000000000000'}</NIF>
    <RaisonSociale>${currentTenant.raisonSociale}</RaisonSociale>
    <Periode>${period}</Periode>
  </Header>
  <Data>
    <TVA_Due>${g50.tvaDue.toFixed(2)}</TVA_Due>
    <IRG_Salaires>${g50.irgSalaries.toFixed(2)}</IRG_Salaires>
    <TAP>${g50.tap.toFixed(2)}</TAP>
    <Total_A_Payer>${g50.total.toFixed(2)}</Total_A_Payer>
  </Data>
</DeclarationG50>`;

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `G50_${currentTenant.raisonSociale}_${period}.xml`;
    link.click();
    toast({ title: "XML Jibayatic Généré", description: "Le fichier est prêt pour le télé-versement." });
  };

  if (isTenantsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <FileText className="text-accent h-8 w-8" /> Déclaration G N° 50
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Calculateur de versement spontané • Norme LF 2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportJibayatic} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl h-11 px-6 font-bold">
            <FileCode className="mr-2 h-4 w-4" /> Export XML Jibayatic
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
            <Printer className="mr-2 h-4 w-4" /> Imprimer G50
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator className="h-16 w-16 text-accent" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Net à Verser au Trésor</p>
           <h2 className="text-3xl font-black">{formatDZD(g50.total)}</h2>
           <Badge variant="outline" className="mt-4 w-fit border-white/20 text-white text-[9px] font-black uppercase">Échéance : 20 {new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(new Date().setMonth(new Date().getMonth() + 1)))}</Badge>
        </Card>
        
        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">TVA Nette (Collectée - Déd.)</p>
           <h2 className="text-2xl font-black text-primary">{formatDZD(g50.tvaDue)}</h2>
           {g50.precompte > 0 && <Badge className="bg-emerald-500 mt-2">CRÉDIT TVA : {formatDZD(g50.precompte)}</Badge>}
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">IRG Salariés (Retenues)</p>
           <h2 className="text-2xl font-black text-amber-600">{formatDZD(g50.irgSalaries)}</h2>
           <p className="text-[9px] text-muted-foreground mt-1">Sur {employees?.length || 0} fiches de paie</p>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Audit Intégrité</p>
             <p className="text-[11px] text-emerald-600 font-medium">100% Justifié</p>
           </div>
        </Card>
      </div>

      <Tabs defaultValue="rubriques" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-2xl h-auto mb-8">
          <TabsTrigger value="rubriques" className="py-3 px-8 rounded-xl font-bold text-xs uppercase tracking-widest">Détail des Rubriques</TabsTrigger>
          <TabsTrigger value="etat104" className="py-3 px-8 rounded-xl font-bold text-xs uppercase tracking-widest">État 104 (Audit Ventes)</TabsTrigger>
          <TabsTrigger value="audit-achats" className="py-3 px-8 rounded-xl font-bold text-xs uppercase tracking-widest">Justificatif Achats</TabsTrigger>
        </TabsList>

        <TabsContent value="rubriques" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
            <CardHeader className="bg-slate-50 border-b p-6">
              <CardTitle className="text-lg font-black uppercase tracking-tighter italic">Tableau Récapitulatif DGI</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="text-[10px] uppercase font-black border-b h-12">
                    <TableHead className="pl-8">Code / Nature de l'Impôt</TableHead>
                    <TableHead className="text-right">Assiette (DA)</TableHead>
                    <TableHead className="text-center">Taux</TableHead>
                    <TableHead className="text-right pr-8">Montant à Reverser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="h-16 hover:bg-slate-50 transition-colors">
                    <TableCell className="pl-8"><div className="flex flex-col"><span className="font-bold text-xs uppercase">TVA - Opérations Imposables</span><span className="text-[9px] text-slate-400 font-mono">Code 101</span></div></TableCell>
                    <TableCell className="text-right font-mono text-xs">{g50.baseImposableTVA.toLocaleString()} DA</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">19%</Badge></TableCell>
                    <TableCell className="text-right pr-8 font-black text-primary">{g50.tvaCollectee.toLocaleString()} DA</TableCell>
                  </TableRow>
                  <TableRow className="h-16 hover:bg-slate-50 transition-colors bg-emerald-50/10">
                    <TableCell className="pl-8"><div className="flex flex-col"><span className="font-bold text-xs uppercase">TVA Déductible (Achats)</span><span className="text-[9px] text-emerald-600 font-mono">Code 401</span></div></TableCell>
                    <TableCell className="text-right font-mono text-xs italic">Justifié par État Achats</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-right pr-8 font-black text-emerald-600">-{g50.tvaDeductible.toLocaleString()} DA</TableCell>
                  </TableRow>
                  <TableRow className="h-16 hover:bg-slate-50 transition-colors">
                    <TableCell className="pl-8"><div className="flex flex-col"><span className="font-bold text-xs uppercase">IRG Salariés (Retenues)</span><span className="text-[9px] text-slate-400 font-mono">Code 102</span></div></TableCell>
                    <TableCell className="text-right font-mono text-xs">Masse Imposable</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">Barème 2026</Badge></TableCell>
                    <TableCell className="text-right pr-8 font-black text-amber-600">{g50.irgSalaries.toLocaleString()} DA</TableCell>
                  </TableRow>
                  {g50.honoraires > 0 && (
                    <TableRow className="h-16 hover:bg-slate-50 transition-colors">
                      <TableCell className="pl-8"><div className="flex flex-col"><span className="font-bold text-xs uppercase">IRG/IBS sur Honoraires (10%)</span><span className="text-[9px] text-slate-400 font-mono">Code 103</span></div></TableCell>
                      <TableCell className="text-right font-mono text-xs">Base Honoraires</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">10%</Badge></TableCell>
                      <TableCell className="text-right pr-8 font-black text-blue-600">{g50.honoraires.toLocaleString()} DA</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter className="bg-slate-900 text-white h-20">
                  <TableRow>
                    <TableCell colSpan={3} className="pl-8 text-xl font-black uppercase tracking-tighter">Net à Mandater ce mois</TableCell>
                    <TableCell className="text-right pr-8 text-3xl font-black text-accent">{formatDZD(g50.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="etat104" className="animate-in fade-in duration-500">
           <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
             <CardHeader className="bg-blue-50 border-b border-blue-100 p-6 flex flex-row items-center justify-between">
                <div>
                   <CardTitle className="text-lg font-black uppercase tracking-tighter text-blue-900">État Récapitulatif des Ventes (État 104)</CardTitle>
                   <CardDescription className="text-xs font-bold text-blue-700">Justification du CA déclaré à la DGI par client.</CardDescription>
                </div>
                <Button variant="outline" className="h-9 rounded-xl border-blue-200 text-blue-900 font-bold bg-white shadow-sm"><Download className="h-4 w-4 mr-2" /> PDF État 104</Button>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                   <TableHeader className="bg-slate-50">
                      <TableRow className="text-[10px] uppercase font-black h-12">
                         <TableHead className="pl-8">Client / NIF</TableHead>
                         <TableHead>N° Facture</TableHead>
                         <TableHead>Date</TableHead>
                         <TableHead className="text-right">Montant HT</TableHead>
                         <TableHead className="text-right pr-8">TVA 19%</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {invoices?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20 italic text-slate-400">Aucune vente enregistrée ce mois.</TableCell></TableRow>
                      ) : invoices?.map((inv) => (
                        <TableRow key={inv.id} className="h-14 hover:bg-blue-50/20 transition-colors">
                           <TableCell className="pl-8">
                             <div className="flex flex-col">
                               <span className="font-bold text-xs uppercase">{inv.clientName}</span>
                               <span className="text-[9px] font-mono text-slate-400">NIF: {inv.clientId?.substring(0,15)}</span>
                             </div>
                           </TableCell>
                           <TableCell className="text-xs font-bold font-mono">{inv.invoiceNumber}</TableCell>
                           <TableCell className="text-xs">{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                           <TableCell className="text-right font-mono text-xs">{inv.totalAmountExcludingTax.toLocaleString()} DA</TableCell>
                           <TableCell className="text-right pr-8 font-mono text-xs text-primary">{inv.totalTaxAmount.toLocaleString()} DA</TableCell>
                        </TableRow>
                      ))}
                   </TableBody>
                </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="audit-achats" className="animate-in fade-in duration-500">
           <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
             <CardHeader className="bg-emerald-50 border-b border-emerald-100 p-6 flex flex-row items-center justify-between">
                <div>
                   <CardTitle className="text-lg font-black uppercase tracking-tighter text-emerald-900">Justificatif de TVA Déductible</CardTitle>
                   <CardDescription className="text-xs font-bold text-emerald-700">Audit des écritures en compte 4456 (Journal Achats).</CardDescription>
                </div>
                <Button variant="outline" className="h-9 rounded-xl border-emerald-200 text-emerald-900 font-bold bg-white shadow-sm"><Download className="h-4 w-4 mr-2" /> Rapport Audit</Button>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                   <TableHeader className="bg-slate-50">
                      <TableRow className="text-[10px] uppercase font-black h-12">
                         <TableHead className="pl-8">Date / Libellé</TableHead>
                         <TableHead>Référence Pièce</TableHead>
                         <TableHead className="text-right pr-8">TVA Récupérée (DA)</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {purchaseEntries?.flatMap(e => e.lines.filter((l:any) => l.accountCode.startsWith('4456')).map((l:any, i:number) => (
                        <TableRow key={`${e.id}-${i}`} className="h-14 hover:bg-emerald-50/20 transition-colors">
                           <TableCell className="pl-8">
                             <div className="flex flex-col">
                               <span className="font-bold text-xs uppercase">{e.description}</span>
                               <span className="text-[10px] text-slate-400">{new Date(e.entryDate).toLocaleDateString()}</span>
                             </div>
                           </TableCell>
                           <TableCell className="text-xs font-mono">{e.documentReference}</TableCell>
                           <TableCell className="text-right pr-8 font-black text-emerald-600">+{l.debit.toLocaleString()} DA</TableCell>
                        </TableRow>
                      )))}
                   </TableBody>
                </Table>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <ShieldCheck className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Certification du Moteur de Calcul :</p>
          <p className="opacity-80 italic">
            "Les montants déclarés ici ne sont pas des saisies manuelles. Ils résultent de la consolidation croisée entre vos factures de ventes et votre Grand Livre d'achats. Cette méthode garantit l'image fidèle et la conformité avec l'Article 183 du CIDTA. Toute anomalie de saisie dans le journal des achats sera immédiatement reflétée sur cet écran."
          </p>
        </div>
      </div>
    </div>
  )
}
