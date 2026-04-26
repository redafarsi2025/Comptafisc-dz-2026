
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
  Zap, Calculator, AlertTriangle, ShieldCheck, Tag, Info, Truck, Warehouse
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

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
    barcode: "",
    name: "",
    name2: "",
    type: "MARCHANDISE",
    unit: "U",
    family: "Standard",
    brand: "",
    model: "",
    minStock: 5,
    maxStock: 100,
    securityStock: 2,
    leadTimeDays: 7,
    valuationMethod: "CMUP",
    mainWarehouse: "Dépôt Central",
    locationBin: "",
    purchasePrice: 0,
    costPrice: 0,
    sellingPrice: 0,
    tvaRate: 19,
    theoreticalStock: 0,
    stockAccount: "30",
    variationAccount: "603"
  })

  React.useEffect(() => {
    setMounted(true)
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
      toast({ title: "Produit ajouté", description: `${newProduct.name} a été intégré au catalogue expert.` });
      setIsCreateOpen(false);
      setNewProduct(prev => ({ ...prev, code: "", name: "", barcode: "", theoreticalStock: 0 }));
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
      value: acc.value + (p.theoreticalStock * (p.costPrice || p.purchasePrice || 0)),
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
            <Boxes className="h-8 w-8 text-accent" /> Catalogue Articles Expert
          </h1>
          <p className="text-muted-foreground text-sm">Gestion logistique, commerciale et valorisation SCF (CMUP).</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-lg" disabled={!currentTenant}>
              <Plus className="mr-2 h-4 w-4" /> Nouvel Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fiche Article ERP Professionnelle</DialogTitle>
              <DialogDescription>Configurez les dimensions logistiques et comptables de la référence.</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="id" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50 mb-4">
                <TabsTrigger value="id">Identification</TabsTrigger>
                <TabsTrigger value="logistics">Logistique</TabsTrigger>
                <TabsTrigger value="financial">Commercial</TabsTrigger>
                <TabsTrigger value="accounting">Comptabilité</TabsTrigger>
              </TabsList>

              <TabsContent value="id" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Code Article (Unique)*</Label>
                    <Input value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value})} placeholder="REF-001" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Code Barre / QR</Label>
                    <Input value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} placeholder="613..." />
                  </div>
                  <div className="grid gap-2">
                    <Label>Désignation*</Label>
                    <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Désignation principale" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Désignation 2 (Arabe/Optionnel)</Label>
                    <Input value={newProduct.name2} onChange={e => setNewProduct({...newProduct, name2: e.target.value})} placeholder="اسم المنتج" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type d'article</Label>
                    <Select value={newProduct.type} onValueChange={v => setNewProduct({...newProduct, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARCHANDISE">Marchandise (30)</SelectItem>
                        <SelectItem value="MATIERE_PREMIERE">Matière Première (31)</SelectItem>
                        <SelectItem value="PRODUIT_FINI">Produit Fini (35)</SelectItem>
                        <SelectItem value="CONSOMMABLE">Consommable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Famille / Catégorie</Label>
                    <Input value={newProduct.family} onChange={e => setNewProduct({...newProduct, family: e.target.value})} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="logistics" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Unité de mesure</Label>
                    <Select value={newProduct.unit} onValueChange={v => setNewProduct({...newProduct, unit: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="U">Unité (U)</SelectItem>
                        <SelectItem value="KG">Kilogramme (KG)</SelectItem>
                        <SelectItem value="L">Litre (L)</SelectItem>
                        <SelectItem value="M">Mètre (M)</SelectItem>
                        <SelectItem value="CARTON">Carton</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Stock Initial</Label>
                    <Input type="number" value={newProduct.theoreticalStock} onChange={e => setNewProduct({...newProduct, theoreticalStock: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Délai Appro (Jours)</Label>
                    <Input type="number" value={newProduct.leadTimeDays} onChange={e => setNewProduct({...newProduct, leadTimeDays: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="grid gap-2">
                    <Label>Stock Minimum</Label>
                    <Input type="number" value={newProduct.minStock} onChange={e => setNewProduct({...newProduct, minStock: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Stock Maximum</Label>
                    <Input type="number" value={newProduct.maxStock} onChange={e => setNewProduct({...newProduct, maxStock: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-amber-600">Stock de Sécurité</Label>
                    <Input type="number" value={newProduct.securityStock} onChange={e => setNewProduct({...newProduct, securityStock: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1"><Warehouse className="h-3 w-3" /> Dépôt Principal</Label>
                    <Input value={newProduct.mainWarehouse} onChange={e => setNewProduct({...newProduct, mainWarehouse: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Emplacement (Bin)</Label>
                    <Input value={newProduct.locationBin} onChange={e => setNewProduct({...newProduct, locationBin: e.target.value})} placeholder="Ex: A-01-C5" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Prix d'Achat HT</Label>
                      <Input type="number" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-primary font-bold">Prix de Revient (Calculé)</Label>
                      <Input type="number" value={newProduct.costPrice} onChange={e => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Prix de Vente HT</Label>
                      <Input type="number" value={newProduct.sellingPrice} onChange={e => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Taux TVA Algérie (%)</Label>
                      <Select value={newProduct.tvaRate.toString()} onValueChange={v => setNewProduct({...newProduct, tvaRate: parseInt(v)})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="19">19% (Normal)</SelectItem>
                          <SelectItem value="9">9% (Réduit)</SelectItem>
                          <SelectItem value="0">0% (Exonéré)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-emerald-800">Marge Brute estimée :</span>
                    <span className="text-lg font-black text-emerald-600">
                      {newProduct.sellingPrice > 0 
                        ? (((newProduct.sellingPrice - newProduct.costPrice) / newProduct.sellingPrice) * 100).toFixed(1) 
                        : "0"} %
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="accounting" className="space-y-4">
                <div className="p-4 bg-muted/20 rounded-xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Compte de Stock (Classe 3)</Label>
                      <Input value={newProduct.stockAccount} onChange={e => setNewProduct({...newProduct, stockAccount: e.target.value})} placeholder="Ex: 3001" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Compte de Variation (603)</Label>
                      <Input value={newProduct.variationAccount} onChange={e => setNewProduct({...newProduct, variationAccount: e.target.value})} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Ces comptes seront utilisés pour générer les écritures d'inventaire à la clôture de l'exercice conforme au PCE.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6 border-t pt-4">
              <Button onClick={handleAddProduct} disabled={isSaving} className="w-full h-12 text-lg">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                Valider l'Article Expert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Valeur de Stock (PAMP)</p>
            <h2 className="text-2xl font-black text-primary">{totals.value.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Références</p>
            <h2 className="text-2xl font-black text-blue-600">{totals.count}</h2>
          </CardContent>
        </Card>
        <Card className={`border-l-4 shadow-sm ${totals.alerts > 0 ? 'border-l-destructive bg-destructive/5' : 'border-l-emerald-500'}`}>
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Alertes Seuil</p>
            <h2 className={`text-2xl font-black ${totals.alerts > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{totals.alerts}</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Méthode de Valorisation</p>
            <h2 className="text-2xl font-black text-amber-600">CMUP / SCF</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Répertoire Central des Articles</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Chercher code ou désignation..." 
                  className="pl-9 h-9 w-64 bg-white" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Article / Famille</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead className="text-right">Stock Théorique</TableHead>
                <TableHead className="text-right">Valeur PAMP</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !filteredProducts.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Aucun article dans le catalogue.</TableCell></TableRow>
              ) : (
                filteredProducts.map((p) => {
                  const val = p.theoreticalStock * (p.costPrice || p.purchasePrice || 0);
                  const isLow = p.theoreticalStock <= p.securityStock;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/5 group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{p.name}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[8px] uppercase">{p.code}</Badge>
                            <span className="text-[9px] text-muted-foreground">{p.family}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-[10px]">
                          <span className="font-bold text-primary flex items-center gap-1"><Warehouse className="h-2 w-2" /> {p.mainWarehouse}</span>
                          <span className="text-muted-foreground">{p.locationBin || "Non affecté"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={isLow ? "text-destructive font-black" : "font-bold"}>{p.theoreticalStock}</span>
                        <span className="text-[9px] ml-1 opacity-60">{p.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-primary">{val.toLocaleString()} DA</TableCell>
                      <TableCell className="text-center">
                        {isLow ? (
                          <Badge className="bg-destructive text-white text-[8px]">RUPTURE</Badge>
                        ) : p.theoreticalStock <= p.minStock ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 text-[8px]">RÉAPPRO</Badge>
                        ) : (
                          <Badge className="bg-emerald-500 text-white text-[8px]">STOCK OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <p className="font-bold uppercase mb-1">Moteur de Valorisation Certifié SCF :</p>
          <p>
            Le système applique par défaut la méthode du **Coût Moyen Unitaire Pondéré (CMUP)** après chaque entrée. 
            Les stocks de classe 3 sont automatiquement synchronisés avec le module de comptabilité pour garantir l'image fidèle lors de la clôture des comptes.
          </p>
        </div>
      </div>
    </div>
  )
}
