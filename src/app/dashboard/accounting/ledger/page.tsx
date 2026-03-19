
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Library, Printer, FileDown, Search, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SCF_ACCOUNTS } from "@/lib/scf-accounts"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'
import { useSearchParams } from "next/navigation"

export default function GrandLivre() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [searchAccount, setSearchAccount] = React.useState("")
  
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

  const ledgerData = React.useMemo(() => {
    if (!entries) return {};
    const ledger: any = {};
    
    entries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (!ledger[line.accountCode]) {
          const accountInfo = SCF_ACCOUNTS.find(a => a.code === line.accountCode);
          ledger[line.accountCode] = {
            name: accountInfo?.name || line.accountName,
            movements: [],
            totalDebit: 0,
            totalCredit: 0
          };
        }
        
        ledger[line.accountCode].movements.push({
          date: entry.entryDate,
          libelle: entry.description,
          ref: entry.documentReference,
          debit: line.debit,
          credit: line.credit
        });
        
        ledger[line.accountCode].totalDebit += line.debit;
        ledger[line.accountCode].totalCredit += line.credit;
      });
    });
    
    return ledger;
  }, [entries]);

  const filteredAccountCodes = React.useMemo(() => {
    return Object.keys(ledgerData).filter(code => 
      code.includes(searchAccount) || ledgerData[code].name.toLowerCase().includes(searchAccount.toLowerCase())
    ).sort();
  }, [ledgerData, searchAccount]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Grand Livre - ${currentTenant?.raisonSociale}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Exercice 2026 | NIF: ${currentTenant?.nif || 'N/A'}`, 14, 30);

    let startY = 40;

    filteredAccountCodes.forEach(code => {
      const acc = ledgerData[code];
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${code} - ${acc.name}`, 14, startY);
      
      const body = acc.movements.map((m: any) => [
        new Date(m.date).toLocaleDateString(),
        m.ref || "-",
        m.libelle,
        m.debit.toLocaleString(),
        m.credit.toLocaleString()
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Date', 'Réf.', 'Libellé', 'Débit', 'Crédit']],
        body: body,
        foot: [['', '', 'TOTAUX', acc.totalDebit.toLocaleString(), acc.totalCredit.toLocaleString()]],
        theme: 'striped',
        margin: { bottom: 20 },
        headStyles: { fillColor: [12, 85, 204] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      startY = (doc as any).lastAutoTable.finalY + 15;
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }
    });

    doc.save(`GrandLivre_${currentTenant?.raisonSociale}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Library className="h-8 w-8 text-accent" /> Grand Livre
          </h1>
          <p className="text-muted-foreground text-sm">Ventilation des opérations par compte du SCF (Art. 13).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}><Printer className="mr-2 h-4 w-4" /> PDF</Button>
          <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrer par compte (ex: 401, 512...)" 
            className="pl-9 bg-white" 
            value={searchAccount}
            onChange={(e) => setSearchAccount(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Reconstruction du Grand Livre...</div>
        ) : filteredAccountCodes.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Aucun mouvement trouvé pour cette période.</div>
        ) : (
          filteredAccountCodes.map(code => (
            <Card key={code} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-muted/10 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <CardTitle className="text-lg font-mono">{code} — {ledgerData[code].name}</CardTitle>
                    <CardDescription>Mouvements comptables du compte</CardDescription>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Solde Débiteur</p>
                      <p className="text-lg font-bold text-primary">
                        {ledgerData[code].totalDebit > ledgerData[code].totalCredit ? (ledgerData[code].totalDebit - ledgerData[code].totalCredit).toLocaleString() : 0} DA
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Solde Créditeur</p>
                      <p className="text-lg font-bold text-accent">
                        {ledgerData[code].totalCredit > ledgerData[code].totalDebit ? (ledgerData[code].totalCredit - ledgerData[code].totalDebit).toLocaleString() : 0} DA
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[120px]">Réf. Pièce</TableHead>
                      <TableHead>Libellé de l'opération</TableHead>
                      <TableHead className="w-[150px] text-right">Débit</TableHead>
                      <TableHead className="w-[150px] text-right">Crédit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerData[code].movements.map((mov: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/5">
                        <TableCell className="text-xs">{new Date(mov.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs font-mono">{mov.ref || "-"}</TableCell>
                        <TableCell className="text-xs">{mov.libelle}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-primary">{mov.debit > 0 ? mov.debit.toLocaleString() : "-"}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-accent">{mov.credit > 0 ? mov.credit.toLocaleString() : "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 font-bold">
                      <TableCell colSpan={3} className="text-right uppercase text-[10px]">Totaux du compte</TableCell>
                      <TableCell className="text-right font-mono">{ledgerData[code].totalDebit.toLocaleString()} DA</TableCell>
                      <TableCell className="text-right font-mono">{ledgerData[code].totalCredit.toLocaleString()} DA</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <div className="p-6 border rounded-xl bg-amber-50 border-amber-200 flex items-center gap-4">
        <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-6 w-6 text-amber-600" />
        </div>
        <div className="text-sm">
          <p className="font-bold text-amber-900">Note de conformité SCF</p>
          <p className="text-amber-800 italic">
            Ce Grand Livre est ventilé selon la nomenclature du Plan Comptable Algérien. 
            Il permet de justifier le solde de chaque compte avant l'édition de la Balance Générale et du Bilan.
          </p>
        </div>
      </div>
    </div>
  )
}
