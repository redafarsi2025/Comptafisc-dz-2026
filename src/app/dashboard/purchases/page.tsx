
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTenant, useFirestore } from '@/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Loader2, Inbox, ShoppingCart } from 'lucide-react'
import { EnrichedPurchaseOrder, getPurchaseOrdersByTenant } from '@/services/purchase.service'
import { cn } from '@/lib/utils'

const statusVariant = {
    draft: 'secondary',
    pending_approval: 'warning',
    approved: 'success',
    rejected: 'destructive',
    invoiced: 'info',
    cancelled: 'secondary'
}

export default function PurchaseOrdersPage() {
  const { currentTenant } = useTenant();
  const db = useFirestore();
  const [orders, setOrders] = React.useState<EnrichedPurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (currentTenant && db) {
      setIsLoading(true);
      getPurchaseOrdersByTenant(db, currentTenant.id)
        .then(setOrders)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [currentTenant, db]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
            <div className='flex flex-col gap-1'>
                <h1 className='text-3xl font-black text-primary flex items-center gap-2 uppercase tracking-tighter'>
                    <ShoppingCart className='h-8 w-8' />
                    Bons de Commande
                </h1>
                <p className='text-muted-foreground font-medium uppercase text-[10px] tracking-widest'>Suivi des engagements et des achats</p>
            </div>
            <Link href="/dashboard/purchases/orders/new">
                <Button className='shadow-lg bg-primary h-11 px-6 rounded-xl font-bold'>
                    <PlusCircle className='mr-2 h-4 w-4' />
                    Nouveau Bon de Commande
                </Button>
            </Link>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Liste des commandes</CardTitle>
                <CardDescription>Retrouvez ici l'historique de tous les bons de commande émis.</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border rounded-xl">
                    <Inbox className="h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun bon de commande</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Cliquez sur "Nouveau Bon de Commande" pour commencer.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-mono font-semibold">{order.reference}</TableCell>
                            <TableCell>{order.supplierName}</TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="text-right font-medium">{order.totalAmount.toLocaleString('fr-DZ')} DA</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={statusVariant[order.status] || 'default'} className='capitalize'>
                                    {order.status.replace('_', ' ')}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
            </CardContent>
        </Card>
    </div>
  );
}
