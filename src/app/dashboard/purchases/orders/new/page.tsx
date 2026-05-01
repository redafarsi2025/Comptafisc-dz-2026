
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTenant, useFirestore } from '@/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DollarSign, PlusCircle, Trash2, ArrowLeft, Loader2, AlertTriangle, FilePlus, Building2, User2 } from 'lucide-react'
import { PurchaseOrderItem } from '@/models/purchase.models'
import { BudgetLine } from '@/models/budget.models'
import { Contact } from '@/models/contact.models'
import { v4 as uuidv4 } from 'uuid'
import { getBudgetByTenant, FullBudgetData } from '@/services/budget.service'
import { getSuppliersByTenant } from '@/services/contact.service'

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { currentTenant } = useTenant();
  const db = useFirestore();

  // Form state
  const [supplierId, setSupplierId] = React.useState('');
  const [budgetLineId, setBudgetLineId] = React.useState('');
  const [items, setItems] = React.useState<PurchaseOrderItem[]>([{ productId: uuidv4(), description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  const [notes, setNotes] = React.useState('');

  // Data state
  const [budgetLines, setBudgetLines] = React.useState<BudgetLine[]>([]);
  const [suppliers, setSuppliers] = React.useState<Contact[]>([]);
  const [dataIsLoading, setDataIsLoading] = React.useState(true);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (currentTenant && db) {
      const fetchData = async () => {
        const fiscalYear = new Date().getFullYear();
        setDataIsLoading(true);
        try {
          const budgetDataPromise = getBudgetByTenant(db, currentTenant.id, fiscalYear);
          const suppliersPromise = getSuppliersByTenant(db, currentTenant.id);
          
          const [budgetData, suppliersData] = await Promise.all([budgetDataPromise, suppliersPromise]);
          
          if (budgetData) {
            setBudgetLines(budgetData.lines);
          }
          setSuppliers(suppliersData);

        } catch (err) {
          console.error("Failed to load page data:", err);
          setError("Impossible de charger les données nécessaires (budget, fournisseurs).");
        } finally {
          setDataIsLoading(false);
        }
      }
      fetchData();
    }
  }, [currentTenant, db]);

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item[field] as any) = value;
    item.totalPrice = item.quantity * item.unitPrice;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: uuidv4(), description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSubmit = async () => {
    if (!supplierId || !budgetLineId || items.some(i => !i.description || i.quantity <= 0 || i.unitPrice <= 0)) {
      setError('Veuillez remplir tous les champs obligatoires du bon de commande.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const payload = {
      tenantId: currentTenant?.id,
      supplierId,
      budgetLineId,
      items,
      totalAmount,
      notes,
      reference: `BC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
    };

    try {
      const response = await fetch('/api/commitments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue.');
      }
      
      router.push('/dashboard/purchases');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (dataIsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
        </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilePlus />
            Nouveau Bon de Commande
          </CardTitle>
          <CardDescription>Remplissez les informations ci-dessous pour créer un bon de commande et engager le budget associé.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erreur de soumission</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                <Select onValueChange={setSupplierId} value={supplierId}>
                    <SelectTrigger><div className='flex items-center gap-2'><Building2 className='h-4 w-4'/> <SelectValue placeholder="Sélectionner un fournisseur..." /></div></SelectTrigger>
                    <SelectContent>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select onValueChange={setBudgetLineId} value={budgetLineId}>
                    <SelectTrigger><div className='flex items-center gap-2'><User2 className='h-4 w-4'/> <SelectValue placeholder="Sélectionner une ligne budgétaire..." /></div></SelectTrigger>
                    <SelectContent>
                        {budgetLines.map(l => {
                             const available = l.allocatedAmount - l.committedAmount;
                             return <SelectItem key={l.id} value={l.id}>{l.accountCode} - {l.label} (Dispo: {available.toLocaleString('fr-DZ')} DA)</SelectItem>
                        })}
                    </SelectContent>
                </Select>
            </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Articles de la commande</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Quantité</TableHead>
                  <TableHead className="w-[150px]">Prix Unitaire</TableHead>
                  <TableHead className="w-[150px] text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell><Input placeholder="Description de l'article" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell className="text-right font-medium">{(item.totalPrice).toLocaleString('fr-DZ')} DA</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-red-500"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4"/> Ajouter une ligne
            </Button>
          </div>

          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-bold">Total de la Commande:</span>
            <span className="text-2xl font-black text-primary">{totalAmount.toLocaleString('fr-DZ')} DA</span>
          </div>

          <Textarea placeholder="Ajouter des notes ou des conditions spécifiques..." value={notes} onChange={e => setNotes(e.target.value)} />

          <Button onClick={handleSubmit} disabled={isSubmitting || dataIsLoading} size="lg" className="w-full font-bold">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4"/>}
            Valider et Engager le Budget
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
