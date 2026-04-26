
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Building2, ShieldCheck, Loader2, Calendar, User, MapPin, Fingerprint, Receipt } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"

const ASSET_CATEGORIES = [
  { id: '204', name: 'Logiciels & Brevets', rate: 20 },
  { id: '211', name: 'Terrains', rate: 0 },
  { id: '213', name: 'Constructions', rate: 5 },
  { id: '215', name: 'Installations Techniques & Matériel', rate: 10 },
  { id: '2182', name: 'Matériel de Transport', rate: 20 },
  { id: '2183', name: 'Matériel de Bureau', rate: 15 },
  { id: '2184', name: 'Mobilier de Bureau', rate: 10 },
]

export default function AssetsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  
  const [newAsset, setNewAsset] = React.useState({
    code: "",
    designation: "",
    category: "215",
    acquisitionDate: "",
    serviceDate: "",
    acquisitionValue: 0,
    residualValue: 0,
    amortizationRate: 10,
    serialNumber: "",
    physicalLocation: "Siège",
    assignedEmployee: "",
    supplier: "",
    invoiceNumber: ""
  })

  React.useEffect(() => {
    setMounted(true)
    const today = new Date().toISOString().split('T')[0];
    setNewAsset(prev => ({
      ...prev,
      acquisitionDate: today,
      serviceDate: today
    }))
  }, [])

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

  const assetsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "assets");
  }, [db, currentTenant?.id]);
  const { data: assets, isLoading } = useCollection(assetsQuery);

  const calculateAmort = (asset: any) => {
    if (!mounted) return { annualDotation: 0, cumul: 0, vnc: asset.acquisitionValue };
    
    const value = asset.acquisitionValue || 0;
    const residual = asset.residualValue || 0;
    const baseAmort = value - residual;
    const rate = (asset.amortizationRate || 0) / 100;
    
    const serviceDate = new Date(asset.serviceDate || asset.acquisitionDate);
    const currentDate = new Date();
    
    if (currentDate < serviceDate) return { annualDotation: 0, cumul: 0, vnc: value };

    const diffTime = Math.abs(currentDate.getTime() - serviceDate.getTime());
    const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    const annualDotation = baseAmort * rate;
    const cumul = Math.min(baseAmort, annualDotation * years);
    const vnc = value - cumul;

    return { annualDotation, cumul, vnc };
  }

  const totals = React.useMemo(() => {
    if (!assets || !mounted) return { value: 0, dotation: 0, vnc: 0 };
    return assets.reduce((acc, a) => {
      const calc = calculateAmort(a);
      return {
        value: acc.value + (a.acquisitionValue || 0),
        dotation: acc.dotation + calc.annualDotation,
        vnc: acc.vnc + calc.vnc
      };
    }, { value: 0, dotation: 0, vnc: 0 });
  }, [assets, mounted]);

  const handleAddAsset = async () => {
    if (!db || !currentTenant || !newAsset.designation) return;
    setIsSaving(true);
    try {
      await addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "assets"), {
        ...newAsset,
        createdAt: new Date().toISOString(),
        physicalStatus: "GOOD"
      });
      toast({ title: "Actif enregistré", description: `${newAsset.designation} ajouté au registre.` });
      setIsDialogOpen(false);
      setNewAsset(prev => ({ ...prev, designation: "", code: "", serialNumber: "" }));
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Building2 className="h-8 w-8 text-accent" /> Registre des Immobilisations
          </h1>
          <p className="text-muted-foreground text-sm">Gestion experte des actifs de classe 2 et amortissements (SCF).</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-lg" disabled={!currentTenant}><Plus className="mr-2 h-4 w-4" /> Nouvel Actif</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fiche Immobilisation SCF Expert</DialogTitle>
              <DialogDescription>Définition des paramètres d'acquisition et d'amortissement conforme au CIDTA.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Code Immo (Unique)</Label>
                  <Input value={newAsset.code} onChange={e => setNewAsset({...newAsset, code: e.target.value})} placeholder="IMM-2026-001" />
                </div>
                <div className="grid gap-2">
                  <Label>Désignation</Label>
                  <Input value={newAsset.designation} onChange={e => setNewAsset({...newAsset, designation: e.target.value})} placeholder="Ex: Serveur Dell PowerEdge" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Catégorie SCF</Label>
                  <Select value={newAsset.category} onValueChange={v => {
                    const cat = ASSET_CATEGORIES.find(c => c.id === v);
                    setNewAsset({...newAsset, category: v, amortizationRate: cat?.rate || 0});
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.id} - {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>N° Série / Châssis</Label>
                  <Input value={newAsset.serialNumber} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} placeholder="SN-123456789" />
                </div>
                <div className="grid gap-2">
                  <Label>Fournisseur</Label>
                  <Input value={newAsset.supplier} onChange={e => setNewAsset({...newAsset, supplier: e.target.value})} placeholder="Ex: IT Solutions DZ" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>Date Acquisition</Label>
                  <Input type="date" value={newAsset.acquisitionDate} onChange={e => setNewAsset({...newAsset, acquisitionDate: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Mise en service (Début Amort.)</Label>
                  <Input type="date" value={newAsset.serviceDate} onChange={e => setNewAsset({...newAsset, serviceDate: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>N° Facture</Label>
                  <Input value={newAsset.invoiceNumber} onChange={e => setNewAsset({...newAsset, invoiceNumber: e.target.value})} placeholder="F-2026-X" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label className="text-primary font-bold">Valeur Brut HT (DA)</Label>
                  <Input type="number" value={newAsset.acquisitionValue} onChange={e => setNewAsset({...newAsset, acquisitionValue: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <Label>Valeur Résiduelle</Label>
                  <Input type="number" value={newAsset.residualValue} onChange={e => setNewAsset({...newAsset, residualValue: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <Label>Taux Amort. (%)</Label>
                  <Input type="number" value={newAsset.amortizationRate} onChange={e => setNewAsset({...newAsset, amortizationRate: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>Localisation Physique</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" value={newAsset.physicalLocation} onChange={e => setNewAsset({...newAsset, physicalLocation: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Employé Responsable</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" value={newAsset.assignedEmployee} onChange={e => setNewAsset({...newAsset, assignedEmployee: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="bg-muted/30 p-4 -mx-6 -mb-6 border-t">
              <Button onClick={handleAddAsset} disabled={isSaving} className="w-full h-12 text-lg shadow-xl bg-primary">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Valider l'Immobilisation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Valeur Brute Totale</p>
            <h2 className="text-2xl font-black text-primary">{totals.value.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Dotations Cumulées</p>
            <h2 className="text-2xl font-black text-amber-600">{(totals.value - totals.vnc).toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Actif Net (VNC)</p>
            <h2 className="text-2xl font-black text-emerald-600">{totals.vnc.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="text-lg">Tableau des Amortissements (Annexe 2)</CardTitle>
          <CardDescription>Justificatif dynamique pour la liasse fiscale G4.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Désignation / Code</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Valeur Brut</TableHead>
                <TableHead className="text-center">Taux</TableHead>
                <TableHead className="text-right">Amort. Cumulé</TableHead>
                <TableHead className="text-right font-black">V.N.C</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow>
              ) : !assets?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic">Aucun actif enregistré.</TableCell></TableRow>
              ) : (
                assets.map((a) => {
                  const calc = calculateAmort(a);
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/5 group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{a.designation}</span>
                          <span className="text-[9px] font-mono text-muted-foreground uppercase">{a.code || a.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{a.serviceDate || a.acquisitionDate}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{a.acquisitionValue.toLocaleString()}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{a.amortizationRate}%</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600">-{calc.cumul.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-primary">{calc.vnc.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteDocumentNonBlocking(doc(db, "tenants", currentTenant!.id, "assets", a.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold underline uppercase">Note de Conformité Algérie :</p>
          <p>
            Le calcul respecte la règle du <strong>pro rata temporis</strong> à partir de la date de mise en service. 
            Les véhicules de tourisme (2182) sont plafonnés à une base amortissable de 1 000 000 DA pour la déductibilité fiscale, 
            sauf pour les entreprises dont c'est l'objet principal de l'activité.
          </p>
        </div>
      </div>
    </div>
  )
}
