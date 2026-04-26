
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FlaskConical, Plus, Trash2, Save, Loader2, 
  ChevronLeft, Beaker, Calculator, ShieldCheck,
  Database, Package, Layers, Info, TrendingUp, Sparkles, PlusCircle
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface RecipeComponent {
  productId: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export default function NewRecipePage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false)
  const [isComponentModalOpen, setIsComponentModalOpen] = React.useState(false)
  const [isCreatingQuickProduct, setIsCreatingQuickProduct] = React.useState(false)

  const [formData, setFormData] = React.useState({
    code: `BOM-${Math.floor(1000 + Math.random() * 9000)}`,
    productId: "",
    overheadCost: 0,
    notes: ""
  })

  const [components, setComponents] = React.useState<RecipeComponent[]>([])

  // Quick Create State
  const [quickProduct, setQuickProduct] = React.useState({
    code: "",
    name: "",
    sellingPrice: 0,
    unit: "U"
  })

  const [quickComponent, setQuickComponent] = React.useState({
    code: "",
    name: "",
    purchasePrice: 0,
    unit: "U"
  })

  React.useEffect(() => { setMounted(true) }, [])

  // Charger tous les produits pour filtrage local
  const productsQuery = useMemoFirebase(() => 
    (db && tenantId) ? collection(db, "tenants", tenantId, "products") : null
  , [db, tenantId]);
  const { data: allProducts, isLoading: isProductsLoading } = useCollection(productsQuery);

  const finishedProducts = React.useMemo(() => 
    allProducts?.filter(p => p.type === "PRODUIT_FINI") || []
  , [allProducts]);

  const rawMaterials = React.useMemo(() => 
    allProducts?.filter(p => p.type === "MATIERE_PREMIERE" || p.type === "MARCHANDISE") || []
  , [allProducts]);

  const selectedTargetProduct = React.useMemo(() => 
    finishedProducts.find(p => p.id === formData.productId)
  , [finishedProducts, formData.productId]);

  const addComponent = (productId: string) => {
    const product = rawMaterials.find(p => p.id === productId);
    if (!product) return;

    if (components.some(c => c.productId === productId)) {
      toast({ variant: "destructive", title: "Doublon", description: "Cet article est déjà dans la nomenclature." });
      return;
    }

    setComponents([...components, {
      productId: product.id,
      code: product.code,
      description: product.name,
      quantity: 1,
      unit: product.unit || "U",
      unitCost: product.purchasePrice || product.costPrice || 0
    }]);
  };

  const removeComponent = (idx: number) => {
    setComponents(components.filter((_, i) => i !== idx));
  };

  const updateComponentQty = (idx: number, qty: number) => {
    const newComps = [...components];
    newComps[idx].quantity = qty;
    setComponents(newComps);
  };

  const materialCost = React.useMemo(() => {
    return components.reduce((sum, c) => sum + (c.quantity * c.unitCost), 0);
  }, [components]);

  const totalProductionCost = materialCost + formData.overheadCost;

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.productId || components.length === 0) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez sélectionner un produit fini et au moins un composant." });
      return;
    }

    setIsSaving(true);
    const recipeData = {
      ...formData,
      productName: selectedTargetProduct?.name || "",
      rawMaterialCost: materialCost,
      totalCost: totalProductionCost,
      components,
      tenantId,
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: { [user.uid]: 'owner' }
    };

    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "recipes"), recipeData);
      toast({ title: "Nomenclature enregistrée", description: `La recette pour ${selectedTargetProduct?.name} est active.` });
      router.push(`/dashboard/industry/recipes?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickCreateProduct = async () => {
    if (!db || !tenantId || !quickProduct.name || !quickProduct.code) return;
    setIsCreatingQuickProduct(true);
    try {
      const docRef = await addDocumentNonBlocking(collection(db, "tenants", tenantId, "products"), {
        ...quickProduct,
        type: "PRODUIT_FINI",
        theoreticalStock: 0,
        valuationMethod: "CMUP",
        stockAccount: "35",
        createdAt: new Date().toISOString()
      });
      if (docRef) {
        toast({ title: "Produit créé", description: quickProduct.name });
        setFormData({ ...formData, productId: docRef.id });
        setIsProductModalOpen(false);
        setQuickProduct({ code: "", name: "", sellingPrice: 0, unit: "U" });
      }
    } finally {
      setIsCreatingQuickProduct(false);
    }
  };

  const handleQuickCreateComponent = async () => {
    if (!db || !tenantId || !quickComponent.name || !quickComponent.code) return;
    setIsCreatingQuickProduct(true);
    try {
      const docRef = await addDocumentNonBlocking(collection(db, "tenants", tenantId, "products"), {
        ...quickComponent,
        type: "MATIERE_PREMIERE",
        theoreticalStock: 0,
        valuationMethod: "CMUP",
        stockAccount: "31",
        createdAt: new Date().toISOString()
      });
      if (docRef) {
        toast({ title: "Composant créé", description: quickComponent.name });
        // Automatically add to current recipe components
        addComponent(docRef.id);
        setIsComponentModalOpen(false);
        setQuickComponent({ code: "", name: "", purchasePrice: 0, unit: "U" });
      }
    } finally {
      setIsCreatingQuickProduct(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/industry/recipes?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Créer une Nomenclature</h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Définition des standards de production (BOM)</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer la Fiche
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Produit de Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Produit Fini à valoriser*</Label>
                <div className="flex gap-2">
                  <Select value={formData.productId} onValueChange={v => setFormData({...formData, productId: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm flex-1">
                      <SelectValue placeholder="Choisir un produit fini" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedProducts.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-primary/20 text-primary">
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouveau Produit Fini (PF)</DialogTitle>
                        <DialogDescription>Créez l'article qui sera le résultat de cette production.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Code Article</Label>
                            <Input value={quickProduct.code} onChange={e => setQuickProduct({...quickProduct, code: e.target.value})} placeholder="PF-001" />
                          </div>
                          <div className="space-y-2">
                            <Label>Unité</Label>
                            <Input value={quickProduct.unit} onChange={e => setQuickProduct({...quickProduct, unit: e.target.value})} placeholder="U, KG, L..." />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Désignation</Label>
                          <Input value={quickProduct.name} onChange={e => setQuickProduct({...quickProduct, name: e.target.value})} placeholder="Ex: Produit fini premium" />
                        </div>
                        <div className="space-y-2">
                          <Label>Prix de Vente HT (Est.)</Label>
                          <Input type="number" value={quickProduct.sellingPrice} onChange={e => setQuickProduct({...quickProduct, sellingPrice: parseFloat(e.target.value) || 0})} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleQuickCreateProduct} disabled={isCreatingQuickProduct} className="w-full">
                          {isCreatingQuickProduct ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Créer et sélectionner
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Code Recette / Version</Label>
                <Input 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="h-11 rounded-xl font-mono font-bold"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-col md:flex-row items-center justify-between py-4 gap-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Nomenclature Technique
              </CardTitle>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select onValueChange={addComponent}>
                  <SelectTrigger className="w-full md:w-64 h-9 text-[10px] font-black uppercase bg-white border-primary/20 text-primary">
                    <Plus className="h-3 w-3 mr-2" /> Ajouter un composant
                  </SelectTrigger>
                  <SelectContent>
                    {rawMaterials.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isComponentModalOpen} onOpenChange={setIsComponentModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 rounded-xl border-primary/20 text-primary px-3 text-[10px] font-black uppercase">
                      <PlusCircle className="h-3 w-3 mr-1.5" /> Nouveau
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvelle Matière Première (MP)</DialogTitle>
                      <DialogDescription>Créez un composant qui manque à votre catalogue.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input value={quickComponent.code} onChange={e => setQuickComponent({...quickComponent, code: e.target.value})} placeholder="MP-001" />
                        </div>
                        <div className="space-y-2">
                          <Label>Unité</Label>
                          <Input value={quickComponent.unit} onChange={e => setQuickComponent({...quickComponent, unit: e.target.value})} placeholder="KG, L..." />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Désignation</Label>
                        <Input value={quickComponent.name} onChange={e => setQuickComponent({...quickComponent, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>P.U Achat HT (PAMP)</Label>
                        <Input type="number" value={quickComponent.purchasePrice} onChange={e => setQuickComponent({...quickComponent, purchasePrice: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleQuickCreateComponent} disabled={isCreatingQuickProduct} className="w-full">
                         {isCreatingQuickProduct ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                         Créer et ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="text-[9px] uppercase font-black h-12">
                    <TableHead className="pl-6">Référence / Nom</TableHead>
                    <TableHead className="text-center">Quantité Unitaire</TableHead>
                    <TableHead className="text-right">P.U Achat (Est.)</TableHead>
                    <TableHead className="text-right">Total Ligne HT</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                          <Beaker className="h-12 w-12" />
                          <p className="text-[10px] font-black uppercase">Aucun composant ajouté.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    components.map((c, idx) => (
                      <TableRow key={c.productId} className="h-16 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs uppercase">{c.description}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">{c.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Input 
                              type="number" 
                              value={c.quantity} 
                              onChange={e => updateComponentQty(idx, parseFloat(e.target.value) || 0)}
                              className="h-8 w-20 text-center font-bold text-xs rounded-lg"
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{c.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{c.unitCost.toLocaleString()} DA</TableCell>
                        <TableCell className="text-right font-black text-xs text-slate-700">{(c.quantity * c.unitCost).toLocaleString()} DA</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => removeComponent(idx)} className="h-8 w-8 text-destructive hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Analyse de Rentabilité</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold opacity-60 uppercase tracking-tighter">
                  <span>Coût Matières HT</span>
                  <span>{materialCost.toLocaleString()} DA</span>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-accent">Frais de Fabrication (Main d'œuvre/Energie)</Label>
                   <Input 
                      type="number"
                      value={formData.overheadCost || ""}
                      onChange={e => setFormData({...formData, overheadCost: parseFloat(e.target.value) || 0})}
                      className="bg-white/5 border-white/10 text-white h-10 rounded-xl font-black focus-visible:ring-accent"
                   />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-baseline">
                   <p className="text-[10px] font-black uppercase text-accent tracking-widest">Coût de Revient Total</p>
                   <span className="text-3xl font-black text-white">{totalProductionCost.toLocaleString()} <span className="text-xs font-normal opacity-50">DA</span></span>
                </div>
                
                {selectedTargetProduct?.sellingPrice && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase">
                        <span className="text-slate-400">Marge Brute Industrielle</span>
                        <span className={selectedTargetProduct.sellingPrice > totalProductionCost ? "text-emerald-400" : "text-destructive"}>
                           {(((selectedTargetProduct.sellingPrice - totalProductionCost) / selectedTargetProduct.sellingPrice) * 100).toFixed(1)}%
                        </span>
                     </div>
                     <Progress value={Math.max(0, ((selectedTargetProduct.sellingPrice - totalProductionCost) / selectedTargetProduct.sellingPrice) * 100)} className="h-1 bg-white/10" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 relative overflow-hidden">
             <ShieldCheck className="absolute -right-4 -bottom-4 h-20 w-20 opacity-10 text-emerald-600" />
             <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
               <ShieldCheck className="h-4 w-4" /> Certification Industrielle
             </h4>
             <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              "La définition exacte d'une nomenclature (BOM) permet de valoriser les stocks de produits finis (Compte 35) à leur coût de production réel conformément au SCF."
             </p>
          </Card>

          <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200">
             <div className="flex items-center gap-2 mb-3">
               <Sparkles className="h-4 w-4 text-primary" />
               <span className="text-[10px] font-black uppercase text-primary tracking-widest">IA Insight</span>
             </div>
             <p className="text-[10px] text-slate-500 italic leading-relaxed">
               "Les prix unitaires des composants sont récupérés en temps réel depuis votre catalogue article (PAMP). Toute variation de prix fournisseur impactera instantanément votre coût de revient simulé ici."
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function calculateSalaireBase(indice: number, valeurPoint: number): number {
  return Math.round(indice * valeurPoint);
}
