
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Scale, Printer, FileDown, Calculator, ShieldCheck, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SCF_ACCOUNTS } from "@/lib/scf-accounts"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'
import { useSearchParams } from "next/navigation"

export default function BalanceGenerale() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "journal_entries"),
      orderBy("entryDate", "asc")
    );
  }, [db, currentTenant?.id]);
  const { data: entries, isLoading } = useCollection(entriesQuery);

  const balanceData = React.useMemo(() => {
    if (!entries) return [];
    const accounts: Record<string, { debit: number; credit: number }> = {};

    entries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (!accounts[line.accountCode]) {
          accounts[line.accountCode] = { debit: 0, credit: 0 };
        }
        accounts[line.accountCode].debit += line.debit;
        accounts[line.accountCode].credit += line.credit;
      });
    });

    return Object.entries(accounts)
      .map(([code, values]) => {
        const scf = SCF_ACCOUNTS.find(a => a.code === code);
        const solde = values.debit - values.credit;
        return {
          code,
          name: scf?.name || "Compte personnalisé",
          class: parseInt(code[0]),
          debitMovements: values.debit,
          creditMovements: values.credit,
          debitBalance: solde > 0 ? solde : 0,
          creditBalance: solde < 0 ? Math.abs(solde) : 0,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [entries]);

  const filteredBalance = React.useMemo(() => {
    return balanceData.filter(item => 
      item.code.includes(searchTerm) || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [balanceData, searchTerm]);

  const totals = React.useMemo(() => {
    return filteredBalance.reduce((acc, curr) => ({
      debitM: acc.debitM + curr.debitMovements,
      creditM: acc.creditM + curr.creditMovements,
      debitB: acc.debitB + curr.debitBalance,
      creditB: acc.creditB + curr.creditBalance,
    }), { debitM: 0, creditM: 0, debitB: 0, creditB: 0 });
  }, [filteredBalance]);

  const formatValue = (val: number) => mounted ? val.toLocaleString() : "..."

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Balance Générale - ${currentTenant?.raisonSociale}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Période : Exercice 2026 | NIF : ${currentTenant?.nif || 'N/A'}`, 14, 30);

    const body = filteredBalance.map(row => [
      row.code,
      row.name,
      row.debitMovements.toLocaleString(),
      row.creditMovements.toLocaleString(),
      row.debitBalance.toLocaleString(),
      row.creditBalance.toLocaleString()
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Compte', 'Intitulé', 'Mouv. Débit', 'Mouv. Crédit', 'Solde Débiteur', 'Solde Créditeur']],
      body: body,
      foot: [['', 'TOTAL GÉNÉRAL', totals.debitM.toLocaleString(), totals.creditM.toLocaleString(), totals.debitB.toLocaleString(), totals.creditB.toLocaleString()]],
      theme: 'grid',
      headStyles: { fillStyle: 'fill', fillColor: [12, 85, 204] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Balance_${currentTenant?.raisonSociale}.pdf`);
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Scale className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Scale className="h-8 w-8 text-accent" /> Balance Générale
          </h1>
          <p className="text-muted-foreground text-sm">Vue synthétique des mouvements et soldes par compte SCF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}><Printer className="mr-2 h-4 w-4" /> Imprimer PDF</Button>
          <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Exporter Excel</Button>
        </div>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Balance à 6 colonnes</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrer par compte ou nom..." 
                className="pl-9 h-9 w-72 bg-white" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-b">
                <TableRow>
                  <TableHead className="w-[100px] border-r">Compte</TableHead>
                  <TableHead className="min-w-[200px] border-r">Intitulé du compte</TableHead>
                  <TableHead colSpan={2} className="text-center border-r bg-blue-50/50">Mouvements Période</TableHead>
                  <TableHead colSpan={2} className="text-center bg-emerald-50/50">Soldes de Clôture</TableHead>
                </TableRow>
                <TableRow className="text-[10px] uppercase font-bold text-muted-foreground">
                  <TableHead className="border-r"></TableHead>
                  <TableHead className="border-r"></TableHead>
                  <TableHead className="text-right w-[120px] bg-blue-50/30">Débit</TableHead>
                  <TableHead className="text-right w-[120px] border-r bg-blue-50/30">Crédit</TableHead>
                  <TableHead className="text-right w-[120px] bg-emerald-50/30">Débiteur</TableHead>
                  <TableHead className="text-right w-[120px] bg-emerald-50/30">Créditeur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!mounted ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">Synchronisation des données...</TableCell></TableRow>
                ) : filteredBalance.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">Aucun mouvement comptable pour la période.</TableCell></TableRow>
                ) : (
                  filteredBalance.map((row) => (
                    <TableRow key={row.code} className="hover:bg-muted/5 transition-colors group">
                      <TableCell className="font-mono text-xs font-bold text-primary">{row.code}</TableCell>
                      <TableCell className="text-xs">{row.name}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-700 bg-blue-50/5">{formatValue(row.debitMovements)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-700 bg-blue-50/5 border-r">{formatValue(row.creditMovements)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 bg-emerald-50/5 font-bold">{row.debitBalance > 0 ? formatValue(row.debitBalance) : "-"}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 bg-emerald-50/5 font-bold">{row.creditBalance > 0 ? formatValue(row.creditBalance) : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {mounted && filteredBalance.length > 0 && (
                <TableFooter className="bg-muted/30 border-t-2 font-black text-xs">
                  <TableRow>
                    <TableCell colSpan={2} className="uppercase tracking-widest text-primary">Total Balance</TableCell>
                    <TableCell className="text-right font-mono text-blue-800">{formatValue(totals.debitM)}</TableCell>
                    <TableCell className="text-right font-mono text-blue-800 border-r">{formatValue(totals.creditM)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-800">{formatValue(totals.debitB)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-800">{formatValue(totals.creditB)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
          <div className="text-xs text-emerald-900">
            <p className="font-bold mb-1">Vérification d'Équilibre (SCF Art. 14)</p>
            <p className="leading-relaxed">
              Le système vérifie que <strong>Total Débits = Total Crédits</strong>. Une balance équilibrée est le prérequis indispensable à l'édition du Bilan et du TCR. 
              En cas d'écart, vérifiez vos écritures d'O.D ou les reports à nouveau.
            </p>
          </div>
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold uppercase text-primary tracking-tighter">Statut Équilibre</h4>
              <Badge className={Math.abs(totals.debitM - totals.creditM) < 0.01 ? "bg-emerald-500" : "bg-destructive"}>
                {Math.abs(totals.debitM - totals.creditM) < 0.01 ? "ÉQUILIBRÉ" : "DÉSÉQUILIBRÉ"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Mouvements :</span>
                <span className="font-bold">{formatValue(totals.debitM)} DA / {formatValue(totals.creditM)} DA</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Soldes :</span>
                <span className="font-bold">{formatValue(totals.debitB)} DA / {formatValue(totals.creditB)} DA</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
