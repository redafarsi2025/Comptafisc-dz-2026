
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, Loader2, ChevronLeft, CalendarDays, ShoppingBag, Calculator, ShieldCheck } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NewPurchaseOrder() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [formData, setFormData] = React.useState({
    orderNumber: `BC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierId: "",
    supplierName: "",
    date: new Date().toISOString().split('T')[0],
    deliveryDate: "",
    paymentTerms: "Virement 30 jours",
    items: [{ description: "", quantity: 1, unitPrice: 0, tvaRate: 19 }]
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Charger les fournisseurs (Tiers de type Fournisseur)
  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "clients"), where("type", "==", "Fournisseur"));
  }, [db, tenantId]);
  const { data: suppliers } = useCollection(suppliersQuery);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unitPrice: 0, tvaRate: 19 }]
    })
  }

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    setFormData({ ...formData, items: newItems });
  }

  const totals = React.useMemo(() => {
    return formData.items.reduce((acc, item) => {
      const ht = item.quantity * item.unitPrice;
      const tva = ht * (item.tvaRate / 100);
      return {
        ht: acc.ht + ht,
        tva: acc.tva + tva,
        ttc: acc.ttc + ht + tva
      };
    }, { ht: 0, tva: 0, ttc: 0 });
  }, [formData.items]);

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.supplierId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fournisseur." });
      return;
    }
    
    setIsSaving(true);
    const selectedSupplier = suppliers?.find(s => s.id === formData.supplierId);

    const orderData = {
      ...formData,
      supplierName: selectedSupplier?.name || "Fournisseur inconnu",
      totalHT: totals.ht,
      totalTVA: totals.tva,
      totalTTC: totals.ttc,
      status: "VALIDATED",
      tenantId,
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: { [user.uid]: 'owner' }
    };

    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "purchase_orders"), orderData);
      toast({ title: "Bon de Commande créé", description: `Le BC ${formData.orderNumber} a été enregistré.` });
      router.push(`/dashboard/purchases/orders?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/purchases/orders?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase">Émettre un Bon de Commande</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Engagement Fournisseur Conforme SCF</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-lg h-11 px-8">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer & Valider le BC
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-xl border-none ring-1 ring-border">
          <CardHeader className="bg-muted/20 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Informations Générales
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>N° Bon de Commande</Label>
                <Input value={formData.orderNumber} readOnly className="bg-muted font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select value={formData.supplierId} onValueChange={(v) => setFormData({...formData, supplierId: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choisir un fournisseur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    {!suppliers?.length && <SelectItem value="none" disabled>Aucun fournisseur trouvé</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">Gérez vos fournisseurs dans "Gestion des Tiers".</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Date de commande</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Date de livraison prévue</Label>
                <Input type="date" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Conditions de Paiement</Label>
              <Select value={formData.paymentTerms} onValueChange={v => setFormData({...formData, paymentTerms: v})}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comptant">Comptant</SelectItem>
                  <SelectItem value="Virement 30 jours">Virement 30 jours</SelectItem>
                  <SelectItem value="Chèque à réception">Chèque à réception</SelectItem>
                  <SelectItem value="Virement 60 jours">Virement 60 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
          <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent">Récapitulatif Financier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm opacity-70">
                <span>Total HT</span>
                <span className="font-mono">{totals.ht.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-sm text-accent">
                <span>Total TVA</span>
                <span className="font-mono">+{totals.tva.toLocaleString()} DA</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
                <span className="text-lg font-bold">TOTAL TTC</span>
                <span className="text-3xl font-black text-accent">{totals.ttc.toLocaleString()} DA</span>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
               <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                 <ShieldCheck className="h-4 w-4" /> MOTEUR DE CONFORMITÉ ACTIF
               </div>
               <p className="text-[10px] opacity-60 leading-relaxed italic">
                 Le Bon de Commande engage l'entreprise. Une fois validé, il servira de base au rapprochement facture pour la déduction légale de TVA (Art. 21 CTCA).
               </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-xl border-none ring-1 ring-border overflow-hidden">
          <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Lignes du Bon de Commande</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem} className="border-primary text-primary">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un article
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="text-[10px] uppercase font-black">
                  <TableHead className="w-1/2">Désignation de l'article / Service</TableHead>
                  <TableHead className="text-center">Quantité</TableHead>
                  <TableHead className="text-right">Prix Unitaire HT</TableHead>
                  <TableHead className="text-center">TVA</TableHead>
                  <TableHead className="text-right font-bold text-primary">Total HT</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/5">
                    <TableCell>
                      <Input 
                        placeholder="Ex: Fourniture Papier A4 80g" 
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        className="h-9 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-9 text-center w-24 mx-auto text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.unitPrice}
                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-9 text-right w-32 ml-auto text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={item.tvaRate.toString()} onValueChange={v => updateItem(idx, 'tvaRate', parseInt(v))}>
                        <SelectTrigger className="h-9 w-24 mx-auto text-[10px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="19">19% (Norm)</SelectItem>
                          <SelectItem value="9">9% (Réd)</SelectItem>
                          <SelectItem value="0">0% (Exo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">
                      {(item.quantity * item.unitPrice).toLocaleString()} DA
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
