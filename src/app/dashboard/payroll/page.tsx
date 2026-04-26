
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Plus, Users, Calculator, Wallet, Printer, Search, 
  Loader2, Info, ReceiptText, ShieldCheck, 
  BookOpen, Fingerprint, HeartPulse, Zap, GraduationCap 
} from "lucide-react"
import { processEmployeePayroll, PAYROLL_CONSTANTS } from "@/lib/calculations"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function PayrollPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  const [newEmployee, setNewEmployee] = React.useState({
    name: "",
    position: "",
    indice: 450,
    echelon: 1,
    primesImposables: 0,
    indemnitePanier: 0,
    indemniteTransport: 0,
    cnasNumber: "",
    nin: "",
    isGrandSud: false,
    isHandicapped: false
  })

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

  const context = {
    valeurPoint: currentTenant?.iepPointValue || PAYROLL_CONSTANTS.DEFAULT_VALEUR_POINT
  };

  const handleAddEmployee = async () => {
    if (!db || !currentTenant || !newEmployee.name) return;

    const payroll = processEmployeePayroll(newEmployee, context);
    if (payroll.salaireBase < PAYROLL_CONSTANTS.SNMG) {
      toast({ 
        variant: "destructive", 
        title: "Inférieur au SNMG", 
        description: `Le salaire de base (${payroll.salaireBase} DA) est inférieur au minimum légal de 24 000 DA.` 
      });
      return;
    }

    try {
      await addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "employees"), {
        ...newEmployee,
        tenantId: currentTenant.id,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Salarié enregistré", description: `${newEmployee.name} a été ajouté au registre indiciaire.` });
      setIsDialogOpen(false);
    } catch (e) { console.error(e); }
  }

  const formatAmount = (val: number) => mounted ? val.toLocaleString() : "...";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-accent" /> Gestion RH & Indiciaire
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Conformité Loi de Finances 2026 • Système à point</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary shadow-lg" disabled={!currentTenant}>
                <Plus className="mr-2 h-4 w-4" /> Nouveau Contrat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Fiche Employé & Paramètres de Paie</DialogTitle>
                <DialogDescription>Définition de l'indice et des rubriques contractuelles.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom & Prénom</Label>
                    <Input value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Identifiant National (NIN)</Label>
                    <Input value={newEmployee.nin} onChange={e => setNewEmployee({...newEmployee, nin: e.target.value})} maxLength={18} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label className="text-primary font-bold">Indice du poste</Label>
                    <Input type="number" value={newEmployee.indice} onChange={e => setNewEmployee({...newEmployee, indice: parseInt(e.target.value)})} />
                    <p className="text-[9px] text-muted-foreground">S. Base : {calculateSalaireBase(newEmployee.indice, context.valeurPoint)} DA</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Échelon</Label>
                    <Input type="number" value={newEmployee.echelon} onChange={e => setNewEmployee({...newEmployee, echelon: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fonction</Label>
                    <Input value={newEmployee.position} onChange={e => setNewEmployee({...newEmployee, position: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Primes Imposables</Label>
                      <Input type="number" value={newEmployee.primesImposables} onChange={e => setNewEmployee({...newEmployee, primesImposables: parseFloat(e.target.value)})} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="sud" checked={newEmployee.isGrandSud} onCheckedChange={v => setNewEmployee({...newEmployee, isGrandSud: !!v})} />
                      <Label htmlFor="sud" className="text-xs">Zone Grand Sud (Art. 120)</Label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Indemnités de frais (Non imposable)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Panier" type="number" value={newEmployee.indemnitePanier} onChange={e => setNewEmployee({...newEmployee, indemnitePanier: parseFloat(e.target.value)})} />
                        <Input placeholder="Transport" type="number" value={newEmployee.indemniteTransport} onChange={e => setNewEmployee({...newEmployee, indemniteTransport: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t rounded-b-lg">
                <Button onClick={handleAddEmployee} className="w-full h-12 shadow-xl bg-primary">Valider le contrat indiciaire</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/payroll/ledger?tenantId=${currentTenant?.id}`}><BookOpen className="mr-2 h-4 w-4" /> Livre de Paie</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="border-l-4 border-l-primary shadow-sm">
           <CardContent className="pt-6">
             <p className="text-[10px] uppercase font-black text-muted-foreground">Valeur Point Indiciaire</p>
             <h2 className="text-2xl font-black text-primary">{context.valeurPoint} DA</h2>
           </CardContent>
         </Card>
         <Card className="border-l-4 border-l-emerald-500 shadow-sm">
           <CardContent className="pt-6">
             <p className="text-[10px] uppercase font-black text-muted-foreground">Masse Salariale Brute</p>
             <h2 className="text-2xl font-black text-emerald-600">
               {formatAmount(employees?.reduce((sum, e) => sum + processEmployeePayroll(e, context).salairePoste, 0) || 0)} DA
             </h2>
           </CardContent>
         </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg">Registre des Salariés</CardTitle>
          <CardDescription>Visualisation en temps réel des impositions selon le barème 2026.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>Employé / NIN</TableHead>
                <TableHead className="text-center">Indice</TableHead>
                <TableHead className="text-right">S. Base</TableHead>
                <TableHead className="text-right">Ret. CNAS (9%)</TableHead>
                <TableHead className="text-right">IRG 2026</TableHead>
                <TableHead className="text-right font-black text-primary">Net à Payer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !employees?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">Aucun contrat enregistré.</TableCell></TableRow>
              ) : (
                employees.map((e) => {
                  const pay = processEmployeePayroll(e, context);
                  return (
                    <TableRow key={e.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{e.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{e.position} • {e.nin}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">{e.indice}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{pay.salaireBase.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">-{pay.cnasSalariale.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">-{pay.irg.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-black text-primary">{pay.net.toLocaleString()} DA</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateSalaireBase(indice: number, valeurPoint: number): number {
  return Math.round(indice * valeurPoint);
}
