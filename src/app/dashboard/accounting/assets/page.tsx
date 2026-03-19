"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Calculator, TrendingDown, Calendar, Building2, ShieldCheck, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

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
  const [mounted, setMounted] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [newAsset, setNewAsset] = React.useState({
    designation: "",
    category: "215",
    acquisitionDate: "",
    acquisitionValue: 0,
    amortizationRate: 10,
  })

  React.useEffect(() => {
    setMounted(true)
    setNewAsset(prev => ({
      ...prev,
      acquisitionDate: new Date().toISOString().split('T')[0]
    }))
  }, [])

  // 1. Fetch Tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // 2. Fetch Assets
  const assetsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "assets"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: assets, isLoading } = useCollection(assetsQuery);

  const handleAddAsset = async () => {
    if (!db || !currentTenant || !newAsset.designation) return;
    setIsSaving(true);

    const assetData = {
      ...newAsset,
      tenantId: currentTenant.id,
      tenantMembers: currentTenant.members,
      createdAt: new Date().toISOString(),
      acquisitionValue: Number(newAsset.acquisitionValue) || 0,
      amortizationRate: Number(newAsset.amortizationRate) || 0,
    };

    try {
      await addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "assets"), assetData);
      toast({ title: "Immobilisation enregistrée", description: `${newAsset.designation} a été ajouté au registre.` });
      setIsDialogOpen(false);
      setNewAsset({ designation: "", category: "215", acquisitionDate: new Date().toISOString().split('T')[0], acquisitionValue: 0, amortizationRate: 10 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  const calculateAmort = (asset: any) => {
    if (!mounted) return { annualDotation: 0, cumul: 0, vnc: asset.acquisitionValue };
    const value = asset.acquisitionValue;
    const rate = asset.amortizationRate / 100;
    const acquisitionDate = new Date(asset.acquisitionDate);
    const currentDate = new Date();
    
    const diffTime = Math.abs(currentDate.getTime() - acquisitionDate.getTime());
    const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    const annualDotation = value * rate;
    const cumul = Math.min(value, annualDotation * years);
    const vnc = Math.max(0, value - cumul);

    return { annualDotation, cumul, vnc };
  }

  const totals = React.useMemo(() => {
    if (!assets || !mounted) return { value: 0, dotation: 0, cumul: 0, vnc: 0 };
    return assets.reduce((acc, a) => {
      const calc = calculateAmort(a);
      return {
        value: acc.value + a.acquisitionValue,
        dotation: acc.dotation + calc.annualDotation,
        cumul: acc.cumul + calc.cumul,
        vnc: acc.vnc + calc.vnc
      };
    }, { value: 0, dotation: 0, cumul: 0, vnc: 0 });
  }, [assets, mounted]);

  if (!mounted) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Building2 className="h-8 w-8 text-accent" /> Registre des Immobilisations
          </h1>
          <p className="text-muted-foreground text-sm">Gestion des actifs de classe 2 et suivi des amortissements (SCF).</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-lg"><Plus className="mr-2 h-4 w-4" /> Nouvel Actif</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer une Immobilisation</DialogTitle>
              <DialogDescription>Saisissez les informations d'acquisition pour générer les dotations.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Désignation de l'élément</Label>
                <Input value={newAsset.designation} onChange={e => setNewAsset({...newAsset, designation: e.target.value})} placeholder="Ex: Véhicule de livraison Renault" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Compte SCF (Catégorie)</Label>
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
                  <Label>Date d'acquisition</Label>
                  <Input type="date" value={newAsset.acquisitionDate} onChange={e => setNewAsset({...newAsset, acquisitionDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valeur d'acquisition (HT)</Label>
                  <Input type="number" value={newAsset.acquisitionValue} onChange={e => setNewAsset({...newAsset, acquisitionValue: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <Label>Taux d'amortissement (%)</Label>
                  <Input type="number" value={newAsset.amortizationRate} onChange={e => setNewAsset({...newAsset, amortizationRate: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddAsset} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Valider l'immobilisation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Valeur Brute Totale</p>
            <h2 className="text-2xl font-bold">{totals.value.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Dotation de l'exercice</p>
            <h2 className="text-2xl font-bold text-amber-600">{totals.dotation.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Amortissements Cumulés</p>
            <h2 className="text-2xl font-bold text-destructive">{totals.cumul.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">V.N.C Totale (Actif Net)</p>
            <h2 className="text-2xl font-bold text-emerald-600">{totals.vnc.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="text-lg">Détail des Immobilisations</CardTitle>
          <CardDescription>Justificatif de la dépréciation des actifs de l'exercice 2026.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Désignation / Compte</TableHead>
                <TableHead>Acquisition</TableHead>
                <TableHead className="text-right">Valeur Brut</TableHead>
                <TableHead className="text-center">Taux</TableHead>
                <TableHead className="text-right">Dotation</TableHead>
                <TableHead className="text-right font-bold">V.N.C</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12">Calcul des dotations en cours...</TableCell></TableRow>
              ) : !assets?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">Aucune immobilisation enregistrée.</TableCell></TableRow>
              ) : (
                assets.map((asset) => {
                  const calc = calculateAmort(asset);
                  return (
                    <TableRow key={asset.id} className="hover:bg-muted/5 group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{asset.designation}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{asset.category} - {ASSET_CATEGORIES.find(c => c.id === asset.category)?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(asset.acquisitionDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{asset.acquisitionValue.toLocaleString()}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{asset.amortizationRate}%</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600">-{calc.annualDotation.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-primary">{calc.vnc.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteDocumentNonBlocking(doc(db, "tenants", currentTenant!.id, "assets", asset.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {assets && assets.length > 0 && (
              <TableFooter className="bg-primary/5">
                <TableRow className="font-bold text-xs">
                  <TableCell colSpan={2}>TOTAUX DU REGISTRE</TableCell>
                  <TableCell className="text-right font-mono">{totals.value.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-amber-600">-{totals.dotation.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-primary">{totals.vnc.toLocaleString()} DA</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900 space-y-2">
          <p className="font-bold">Note de Conformité SCF (Annexe 2)</p>
          <p>
            Ces données alimentent automatiquement le <strong>Tableau des Amortissements</strong> de votre liasse fiscale G4. 
            Conformément au CIDTA, les dotations sont calculées au prorata temporis à partir de la date de mise en service. 
            Les véhicules de tourisme sont plafonnés à 1 000 000 DA pour la déductibilité fiscale.
          </p>
        </div>
      </div>
    </div>
  )
}
