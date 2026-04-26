
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Boxes, Plus, Search, Filter, 
  TrendingUp, TrendingDown, Loader2, PackageSearch,
  Zap, Calculator, AlertTriangle, ShieldCheck
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

const CATEGORIES = [
  { id: 'MP', name: 'Matières Premières (31)' },
  { id: 'PF', name: 'Produits Finis (35)' },
  { id: 'MC', name: 'Marchandises (30)' },
  { id: 'EM', name: 'Emballages (32)' },
]

export default function StockManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  
  const [newProduct, setNewProduct] = React.useState({
    code: "",
    name: "",
    category: "MC",
    unit: "Unité",
    minStock: 5,
    theoreticalStock: 0,
    cmup: 0 // Coût Moyen Unitaire Pondéré
  })

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

  const stockQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(collection(db, "tenants", currentTenant.id, "products"), orderBy("name", "asc"));
  }, [db, currentTenant?.id]);
  const { data: products, isLoading } = useCollection(stockQuery);

  const handleAddProduct = async () => {
    if (!db || !currentTenant || !newProduct.name || !newProduct.code) return;
    setIsSaving(true);

    try {
      await addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "products"), {
        ...newProduct,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Produit ajouté", description: `${newProduct.name} a été intégré au catalogue.` });
      setIsCreateOpen(false);
      setNewProduct({ code: "", name: "", category: "MC", unit: "Unité", minStock: 5, theoreticalStock: 0, cmup: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const totals = React.useMemo(() => {
    if (!products) return { value: 0, count: 0, alerts: 0 };
    return products.reduce((acc, p) => ({
      value: acc.value + (p.theoreticalStock * p.cmup),
      count: acc.count + 1,
      alerts: acc.alerts + (p.theoreticalStock <= p.minStock ? 1 : 0)
    }), { value: 0, count: 0, alerts: 0 });
  }, [products]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Boxes className="h-8 w-8 text-accent" /> Gestion des Stocks
          </h1>
          <p className="text-muted-foreground text-sm">Inventaire permanent et valorisation CMUP (Système SCF).</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary shadow-lg" disabled={!currentTenant}>
                <Plus className="mr-2 h-4 w-4" /> Nouveau Produit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter une référence</DialogTitle>
                <DialogDescription>Configurez les paramètres de suivi de stock et de valorisation.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Code Article / SKU</Label>
                    <Input value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value})} placeholder="P001" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Désignation</Label>
                    <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Nom du produit..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Compte SCF (Catégorie)</Label>
                    <Select value={newProduct.category} onValueChange={v => setNewProduct({...newProduct, category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Unité de mesure</Label>
                    <Input value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="grid gap-2">
                    <Label>Stock Initial</Label>
                    <Input type="number" value={newProduct.theoreticalStock} onChange={e => setNewProduct({...newProduct, theoreticalStock: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>P.U Achat (CMUP)</Label>
                    <Input type="number" value={newProduct.cmup} onChange={e => setNewProduct({...newProduct, cmup: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Stock de sécurité</Label>
                    <Input type="number" value={newProduct.minStock} onChange={e => setNewProduct({...newProduct, minStock: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddProduct} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Enregistrer l'article
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="border-accent text-accent">
            <TrendingUp className="mr-2 h-4 w-4" /> Mouvements
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Valeur du Stock (PAMP)</p>
            <h2 className="text-2xl font-black text-primary">{totals.value.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Articles Référencés</p>
            <h2 className="text-2xl font-black text-blue-600">{totals.count} refs</h2>
          </CardContent>
        </Card>
        <Card className={`border-l-4 shadow-sm ${totals.alerts > 0 ? 'border-l-destructive bg-destructive/5' : 'border-l-emerald-500'}`}>
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Ruptures / Alertes</p>
            <h2 className={`text-2xl font-black ${totals.alerts > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{totals.alerts}</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Rotation (Moyenne)</p>
            <h2 className="text-2xl font-black text-amber-600">12.5j</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Catalogue Articles & Stocks</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Chercher code ou nom..." 
                  className="pl-9 h-9 w-64 bg-white" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Produit / Code</TableHead>
                <TableHead>Catégorie (SCF)</TableHead>
                <TableHead className="text-right">Stock Actuel</TableHead>
                <TableHead className="text-right">CMUP (DA)</TableHead>
                <TableHead className="text-right font-bold">Valeur Inventaire</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !filteredProducts.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">Aucun article trouvé.</TableCell></TableRow>
              ) : (
                filteredProducts.map((p) => {
                  const val = p.theoreticalStock * p.cmup;
                  const isLow = p.theoreticalStock <= p.minStock;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/5 group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{p.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{p.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold">
                          {CATEGORIES.find(c => c.id === p.category)?.name.split(' (')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {p.theoreticalStock} <span className="text-[9px] text-muted-foreground font-normal">{p.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{p.cmup.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{val.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        {isLow ? (
                          <div className="flex items-center justify-center gap-1 text-destructive font-bold text-[9px]">
                            <AlertTriangle className="h-3 w-3" /> RÉAPPRO.
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-[9px]">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {products && products.length > 0 && (
              <TableFooter className="bg-primary/5">
                <TableRow className="font-black">
                  <TableCell colSpan={4}>TOTAL VALORISATION STOCK ACTUEL</TableCell>
                  <TableCell className="text-right text-lg text-primary">{totals.value.toLocaleString()} DA</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
          <div className="text-xs text-emerald-900 space-y-2">
            <p className="font-bold">Moteur de Valorisation SCF</p>
            <p>
              Le système utilise la méthode du <strong>Coût Moyen Unitaire Pondéré (CMUP)</strong> par défaut, conformément aux recommandations du SCF pour les inventaires permanents. 
              Toutes les entrées (Achats) et sorties (Ventes) recalculent dynamiquement le coût de revient pour une liasse fiscale G4 précise.
            </p>
          </div>
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader><CardTitle className="text-sm">Aide à la clôture</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground italic">
            "Le stock de fin d'exercice doit être validé par un PV d'inventaire physique avant le 31 Mars de l'année N+1. L'écart entre stock physique et théorique génère une écriture automatique en compte 603 (Variation de stock)."
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
