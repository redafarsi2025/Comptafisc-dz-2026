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
import { Plus, Users, Calculator, Wallet, Printer, FileDown, Search, Loader2, Info, ReceiptText } from "lucide-react"
import { PAYROLL_CONSTANTS, calculateIRG } from "@/lib/calculations"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PayrollPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [newEmployee, setNewEmployee] = React.useState({
    name: "",
    position: "",
    baseSalary: 20000,
    primesImposables: 0,
    indemnitePanier: 0,
    indemniteTransport: 0,
    cnasNumber: ""
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? val.toLocaleString() : "..."

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

  const calculatePayroll = (base: number, primes: number, panier: number, transport: number) => {
    // Salaire de Poste (Assiette CNAS)
    const salairePoste = base + primes;
    const cnasEmployee = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
    
    // Net Imposable
    const imposable = salairePoste - cnasEmployee;
    const irg = calculateIRG(imposable);
    
    // Salaire Net (Imposable - IRG + Indemnités non imposables)
    const net = imposable - irg + panier + transport;
    
    // Cotisations Patronales
    const cnasEmployer = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYER;
    
    return { salairePoste, cnasEmployee, irg, net, cnasEmployer, imposable };
  }

  const handleAddEmployee = async () => {
    if (!db || !currentTenant || !newEmployee.name) return;

    if (newEmployee.baseSalary < PAYROLL_CONSTANTS.SNMG) {
      toast({
        variant: "destructive",
        title: "Erreur SNMG",
        description: `Le salaire de base ne peut être inférieur au SNMG (${PAYROLL_CONSTANTS.SNMG} DA).`
      });
      return;
    }

    const employeeData = {
      ...newEmployee,
      tenantId: currentTenant.id,
      tenantMembers: currentTenant.members,
      createdAt: new Date().toISOString(),
      baseSalary: Number(newEmployee.baseSalary) || 0,
      primesImposables: Number(newEmployee.primesImposables) || 0,
      indemnitePanier: Number(newEmployee.indemnitePanier) || 0,
      indemniteTransport: Number(newEmployee.indemniteTransport) || 0
    };

    try {
      addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "employees"), employeeData);
      toast({ title: "Salarié ajouté", description: `${newEmployee.name} a été inscrit au registre.` });
      setIsDialogOpen(false);
      setNewEmployee({ name: "", position: "", baseSalary: 20000, primesImposables: 0, indemnitePanier: 0, indemniteTransport: 0, cnasNumber: "" });
    } catch (e) {
      console.error(e);
    }
  }

  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  const totals = React.useMemo(() => {
    if (!filteredEmployees) return { gross: 0, cnas: 0, net: 0, irg: 0 };
    return filteredEmployees.reduce((acc, e) => {
      const calc = calculatePayroll(e.baseSalary, e.primesImposables || 0, e.indemnitePanier || 0, e.indemniteTransport || 0);
      return {
        gross: acc.gross + calc.salairePoste,
        cnas: acc.cnas + (calc.cnasEmployee + calc.cnasEmployer),
        irg: acc.irg + calc.irg,
        net: acc.net + calc.net
      };
    }, { gross: 0, cnas: 0, net: 0, irg: 0 });
  }, [filteredEmployees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Users className="h-8 w-8 text-accent" /> Gestion Sociale & Paie
          </h1>
          <p className="text-muted-foreground text-sm">Conforme Loi 90-11, SNMG et Barème IRG 2024.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary">
                <Plus className="mr-2 h-4 w-4" /> Ajouter un Salarié
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Fiche Salarié & Contrat</DialogTitle>
                <DialogDescription>Paramétrez les éléments fixes du salaire (Loi 90-11).</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Nom & Prénom</Label>
                    <Input value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} placeholder="Ex: Mohamed Amine" />
                  </div>
                  <div className="grid gap-2">
                    <Label>N° CNAS</Label>
                    <Input value={newEmployee.cnasNumber} onChange={e => setNewEmployee({...newEmployee, cnasNumber: e.target.value})} placeholder="XX XXXX XXXX XX" />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Rubriques de Paie (Mensuel)</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label className="text-primary font-bold">Salaire de Base (Min: 20 000 DA)</Label>
                        <Input type="number" value={newEmployee.baseSalary} onChange={e => setNewEmployee({...newEmployee, baseSalary: parseFloat(e.target.value)})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Primes Imposables (IEP, PRI...)</Label>
                        <Input type="number" value={newEmployee.primesImposables} onChange={e => setNewEmployee({...newEmployee, primesImposables: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Indemnité Panier (Non imposable)</Label>
                        <Input type="number" value={newEmployee.indemnitePanier} onChange={e => setNewEmployee({...newEmployee, indemnitePanier: parseFloat(e.target.value)})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Indemnité Transport (Non imposable)</Label>
                        <Input type="number" value={newEmployee.indemniteTransport} onChange={e => setNewEmployee({...newEmployee, indemniteTransport: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddEmployee} className="w-full">Valider le profil salarié</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> Livre de Paie</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold opacity-80">Masse Salariale (Brut)</p>
            <h2 className="text-2xl font-bold">{formatAmount(totals.gross)} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Net à Payer Total</p>
            <h2 className="text-2xl font-bold text-emerald-600">{formatAmount(totals.net)} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">IRG Salarié (G50)</p>
            <h2 className="text-2xl font-bold text-amber-600">{formatAmount(totals.irg)} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">CNAS Globale (35%)</p>
            <h2 className="text-2xl font-bold text-blue-600">{formatAmount(totals.cnas)} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Registre du Personnel</TabsTrigger>
          <TabsTrigger value="bulletins">Simulateur Bulletins de Paie</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="shadow-md border-t-4 border-t-primary overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Livre de Paie - {mounted ? new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : "..."}</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Chercher par nom..." 
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
                    <TableHead>Salarié</TableHead>
                    <TableHead className="text-right">S. Base</TableHead>
                    <TableHead className="text-right">Primes</TableHead>
                    <TableHead className="text-right">CNAS (9%)</TableHead>
                    <TableHead className="text-right">IRG</TableHead>
                    <TableHead className="text-right font-bold text-primary">Net à Payer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Calcul de la paie en cours...</TableCell></TableRow>
                  ) : !filteredEmployees.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Aucun salarié enregistré.</TableCell></TableRow>
                  ) : (
                    filteredEmployees.map((e) => {
                      const calc = calculatePayroll(e.baseSalary, e.primesImposables || 0, e.indemnitePanier || 0, e.indemniteTransport || 0);
                      return (
                        <TableRow key={e.id} className="hover:bg-muted/10">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold">{e.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{e.position || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatAmount(e.baseSalary)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">+{formatAmount(e.primesImposables || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-destructive">-{formatAmount(calc.cnasEmployee)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-destructive">-{formatAmount(calc.irg)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold text-primary">{formatAmount(calc.net)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {filteredEmployees.length > 0 && (
                  <TableFooter className="bg-primary/5">
                    <TableRow className="font-bold">
                      <TableCell>TOTAL GÉNÉRAL</TableCell>
                      <TableCell colSpan={4}></TableCell>
                      <TableCell className="text-right text-primary text-lg">{formatAmount(totals.net)} DA</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulletins">
          <div className="grid md:grid-cols-2 gap-6">
            {filteredEmployees.map(e => {
              const calc = calculatePayroll(e.baseSalary, e.primesImposables || 0, e.indemnitePanier || 0, e.indemniteTransport || 0);
              return (
                <Card key={e.id} className="border-dashed border-2">
                  <CardHeader className="pb-2 border-b">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-sm">Bulletin de Paie Simplifié</CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold">Période: {mounted ? new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : "..."}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Confidenciel</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between text-xs"><span>Nom: <strong>{e.name}</strong></span> <span>N° CNAS: {e.cnasNumber || 'N/A'}</span></div>
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs border-b pb-1"><span>Salaire de base</span> <span>{formatAmount(e.baseSalary)}</span></div>
                      <div className="flex justify-between text-xs border-b pb-1"><span>Primes imposables</span> <span>{formatAmount(e.primesImposables || 0)}</span></div>
                      <div className="flex justify-between text-xs text-primary font-bold"><span>S. BRUT (Assiette CNAS)</span> <span>{formatAmount(calc.salairePoste)}</span></div>
                      <div className="flex justify-between text-xs text-destructive"><span>CNAS Salarié (9%)</span> <span>-{formatAmount(calc.cnasEmployee)}</span></div>
                      <div className="flex justify-between text-xs border-b pb-1"><span>Net Imposable</span> <span>{formatAmount(calc.imposable)}</span></div>
                      <div className="flex justify-between text-xs text-destructive"><span>IRG</span> <span>-{formatAmount(calc.irg)}</span></div>
                      <div className="flex justify-between text-xs"><span>Indemnité Panier</span> <span>+{formatAmount(e.indemnitePanier || 0)}</span></div>
                      <div className="flex justify-between text-xs"><span>Indemnité Transport</span> <span>+{formatAmount(e.indemniteTransport || 0)}</span></div>
                    </div>
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg flex justify-between items-center">
                      <span className="font-bold text-primary">NET À PAYER</span>
                      <span className="text-xl font-black text-primary">{formatAmount(calc.net)} DA</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 p-2 flex justify-center">
                    <Button variant="ghost" size="sm" className="text-[10px] h-7"><FileDown className="h-3 w-3 mr-1" /> Télécharger PDF</Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold mb-1">Rappel de conformité Loi de Finances 2022/2024 :</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>L'exonération totale de l'IRG s'applique aux salaires inférieurs ou égaux à 30 000 DA.</li>
            <li>Le lissage de l'IRG pour la tranche 30 000 - 35 000 DA est automatiquement géré par le moteur.</li>
            <li>Les indemnités de Panier et de Transport sont exclues de l'assiette CNAS et IRG selon les plafonds réglementaires.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
