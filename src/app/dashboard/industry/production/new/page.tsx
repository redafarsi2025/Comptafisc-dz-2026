
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Factory, PlayCircle, ChevronLeft, Loader2, 
  Settings, Layers, Package, Database, Sparkles,
  ClipboardList, Info, AlertTriangle, Save
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function NewProductionOrderPage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [formData, setFormData] = React.useState({
    orderNumber: `OF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    productId: "",
    recipeId: "",
    targetQty: 1,
    startDate: new Date().toISOString().split('T')[0],
    notes: ""
  })

  React.useEffect(() => { setMounted(true) }, [])

  // Charger les produits finis
  const productsQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "products"), where("type", "==", "PRODUIT_FINI")) : null
  , [db, tenantId]);
  const { data: finishedProducts } = useCollection(productsQuery);

  // Charger les recettes
  const recipesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "recipes")) : null
  , [db, tenantId]);
  const { data: recipes } = useCollection(recipesQuery);

  const selectedProduct = React.useMemo(() => 
    finishedProducts?.find(p => p.id === formData.productId)
  , [finishedProducts, formData.productId]);

  const selectedRecipe = React.useMemo(() => 
    recipes?.find(r => r.id === formData.recipeId)
  , [recipes, formData.recipeId]);

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.productId || !formData.recipeId) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez sélectionner un produit et une recette." });
      return;
    }

    setIsSaving(true);
    const orderData = {
      ...formData,
      productName: selectedProduct?.name || "",
      unit: selectedProduct?.unit || "U",
      status: "PLANNED",
      progress: 0,
      tenantId,
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: { [user.uid]: 'owner' }
    };

    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "production_orders"), orderData);
      toast({ title: "Ordre de Fabrication créé", description: `L'OF ${formData.orderNumber} est planifié.` });
      router.push(`/dashboard/industry/production?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/industry/production?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Nouveau Lancement</h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Ouverture d'un dossier de fabrication</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Valider la Planification
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Configuration du Produit
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Produit Fini à fabriquer*</Label>
                  <Select value={formData.productId} onValueChange={v => setFormData({...formData, productId: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedProducts?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Fiche Recette (Nomenclature)*</Label>
                  <Select value={formData.recipeId} onValueChange={v => setFormData({...formData, recipeId: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue placeholder="Choisir une recette" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes?.filter(r => r.productId === formData.productId || !formData.productId).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.productName} - {r.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Quantité Cible</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      min="1" 
                      value={formData.targetQty} 
                      onChange={e => setFormData({...formData, targetQty: parseFloat(e.target.value) || 1})}
                      className="h-11 rounded-xl font-black text-lg pr-12"
                    />
                    <span className="absolute right-4 top-3 text-[10px] font-bold text-slate-300 uppercase">{selectedProduct?.unit || 'U'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedRecipe && (
            <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-2">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Besoins en Matières Premières (Calculés)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="text-[10px] uppercase font-black">
                      <TableHead className="pl-6">Composant</TableHead>
                      <TableHead className="text-center">Dosage Unitaire</TableHead>
                      <TableHead className="text-right pr-6">Besoin Total pour {formData.targetQty} {selectedProduct?.unit}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecipe.components?.map((c: any, i: number) => (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="pl-6 font-bold uppercase">{c.description || 'MP'}</TableCell>
                        <TableCell className="text-center">{c.quantity} {c.unit}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-primary">{(c.quantity * formData.targetQty).toLocaleString()} {c.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Settings className="absolute -right-4 -top-4 h-24 w-24 opacity-10 animate-spin-slow" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Identification OF</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase opacity-60">Référence Dossier</Label>
                <p className="text-xl font-black font-mono tracking-tighter">{formData.orderNumber}</p>
              </div>
              <div className="space-y-1 pt-4 border-t border-white/10">
                <Label className="text-[9px] font-black uppercase opacity-60">Date de Lancement prévue</Label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="bg-white/5 border-white/10 h-10 rounded-xl text-white text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 relative overflow-hidden">
             <Sparkles className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-emerald-600" />
             <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
               <Database className="h-4 w-4" /> Automate Industriel
             </h4>
             <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              "Le lancement effectif de cet ordre de fabrication bloquera automatiquement les quantités nécessaires en stock pour garantir la continuité du cycle de production."
             </p>
          </Card>

          <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-3">
             <Info className="h-5 w-5 text-blue-600 shrink-0" />
             <p className="text-[10px] text-blue-900 leading-relaxed italic">
               Assurez-vous que les Prix d'Achat Moyen Pondérés (PAMP) de vos matières premières sont à jour pour un calcul exact du prix de revient industriel.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
