
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Calculator, Wallet, Printer, FileDown, Search, Loader2 } from "lucide-react"
import { PAYROLL_CONSTANTS, calculateIRG } from "@/lib/calculations"
import { toast } from "@/hooks/use-toast"

export default function PayrollPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [newEmployee, setNewEmployee] = React.useState({
    name: "",
    position: "",
    baseSalary: 0,
    primes: 0,
    cnasNumber: ""
  })

  // Fetch active tenant with security filter
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // Fetch employees with security filter
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "employees"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const calculatePayroll = (base: number, primes: number) => {
    const gross = base + primes;
    const cnasEmployee = gross * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
    const imposable = gross - cnasEmployee;
    const irg = calculateIRG(imposable);
    const net = imposable - irg;
    const cnasEmployer = gross * PAYROLL_CONSTANTS.CNAS_EMPLOYER;
    return { gross, cnasEmployee, irg, net, cnasEmployer };
  }

  const handleAddEmployee = async () => {
    if (!db || !currentTenant || !newEmployee.name) return;

    const employeeData = {
      ...newEmployee,
      tenantId: currentTenant.id,
      tenantMembers: currentTenant.members,
      createdAt: new Date().toISOString(),
      baseSalary: Number(newEmployee.baseSalary) || 0,
      primes: Number(newEmployee.primes) || 0
    };

    try {
      addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "employees"), employeeData);
      toast({ title: "Salarié ajouté", description: `${newEmployee.name} a été inscrit au registre.` });
      setIsDialogOpen(false);
      setNewEmployee({ name: "", position: "", baseSalary: 0, primes: 0, cnasNumber: "" });
    } catch (e) {
      console.error(e);
    }
  }

  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  const totals = React.useMemo(() => {
    if (!filteredEmployees) return { gross: 0, cnas: 0, net: 0 };
    return filteredEmployees.reduce((acc, e) => {
      const calc = calculatePayroll(e.baseSalary, e.primes);
      return {
        gross: acc.gross + calc.gross,
        cnas: acc.cnas + (calc.cnasEmployee + calc.cnasEmployer),
        net: acc.net + calc.net
      };
    }, { gross: 0, cnas: 0, net: 0 });
  }, [filteredEmployees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Users className="h-8 w-8 text-accent" /> Livre de Paye
          </h1>
          <p className="text-muted-foreground text-sm">Gestion du personnel et calculs réglementaires (CNAS & IRG).</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary">
                <Plus className="mr-2 h-4 w-4" /> Recruter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fiche Salarié</DialogTitle>
                <DialogDescription>Ajoutez un nouveau collaborateur au registre du personnel.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nom & Prénom</Label>
                  <Input value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Poste</Label>
                    <Input value={newEmployee.position} onChange={e => setNewEmployee({...newEmployee, position: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>N° CNAS</Label>
                    <Input value={newEmployee.cnasNumber} onChange={e => setNewEmployee({...newEmployee, cnasNumber: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Salaire de base (DA)</Label>
                    <Input type="number" value={newEmployee.baseSalary} onChange={e => setNewEmployee({...newEmployee, baseSalary: parseFloat(e.target.value)})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Primes & Indemnités (DA)</Label>
                    <Input type="number" value={newEmployee.primes} onChange={e => setNewEmployee({...newEmployee, primes: parseFloat(e.target.value)})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddEmployee}>Enregistrer le salarié</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-lg">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold opacity-80">Masse Salariale brute</p>
            <h2 className="text-3xl font-bold">{totals.gross.toLocaleString()} DA</h2>
            <Badge variant="outline" className="mt-2 text-white border-white/20">Cotisable CNAS</Badge>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Net à payer total</CardTitle></CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-emerald-600">{totals.net.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Cotisations CNAS (35%)</CardTitle></CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-amber-600">{totals.cnas.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Registre de Paye Mensuel</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher salarié..." 
                className="pl-9 h-9 w-64 bg-white" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Employé / Poste</TableHead>
                <TableHead className="text-right">S. Brut</TableHead>
                <TableHead className="text-right">CNAS (9%)</TableHead>
                <TableHead className="text-right">IRG</TableHead>
                <TableHead className="text-right font-bold text-primary">S. Net</TableHead>
                <TableHead className="text-right">CNAS Patr.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement du personnel...</TableCell></TableRow>
              ) : !filteredEmployees.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Aucun salarié trouvé.</TableCell></TableRow>
              ) : (
                filteredEmployees.map((e) => {
                  const calc = calculatePayroll(e.baseSalary, e.primes);
                  return (
                    <TableRow key={e.id} className="hover:bg-muted/10">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold">{e.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{e.position || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{calc.gross.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">-{calc.cnasEmployee.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">-{calc.irg.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-primary">{calc.net.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] text-muted-foreground">{calc.cnasEmployer.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="bg-muted/50 border-t p-4 flex items-center gap-4">
          <Calculator className="h-5 w-5 text-primary" />
          <div className="text-xs text-muted-foreground italic">
            Note : Les calculs respectent le barème de l'IRG 2024 (abattement 30 000 DA) et le taux CNAS ouvrier de 9%. 
            Ce registre peut être exporté pour justifier la déclaration DAS annuelle.
          </div>
        </CardFooter>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" /> Ordres de Virement</CardTitle></CardHeader>
          <CardContent className="text-xs text-emerald-800">
            Générez les fichiers de virement bancaire ou CCP pour l'ensemble du personnel en un clic. 
            Conforme aux normes interbancaires algériennes.
            <Button variant="link" className="text-emerald-600 h-auto p-0 ml-2">Télécharger ZIP</Button>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileDown className="h-4 w-4 text-blue-600" /> Déclaration CNAS</CardTitle></CardHeader>
          <CardContent className="text-xs text-blue-800">
            Préparez votre déclaration mensuelle ou trimestrielle. 
            Montant total à reverser : <strong>{totals.cnas.toLocaleString()} DA</strong>.
            <Button variant="link" className="text-blue-600 h-auto p-0 ml-2">Voir bordereau</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
