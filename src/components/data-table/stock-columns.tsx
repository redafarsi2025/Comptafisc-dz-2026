'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Stock } from './stock-data';

export const columns: ColumnDef<Stock>[] = [
  {
    accessorKey: 'name',
    header: 'Article',
  },
  {
    accessorKey: 'quantity',
    header: 'Quantité',
  },
  {
    accessorKey: 'unitCost',
    header: () => <div className="text-right">Coût Unitaire (DA)</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('unitCost'));
      const formatted = new Intl.NumberFormat('fr-DZ', {
        style: 'currency',
        currency: 'DZD',
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant =
        status === 'En stock'
          ? 'default'
          : status === 'Stock faible'
          ? 'secondary'
          : 'destructive';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
    {
    accessorKey: 'supplier',
    header: 'Fournisseur',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const stock = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(stock.id)}
            >
              Copier l'ID de l'article
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Voir les détails</DropdownMenuItem>
            <DropdownMenuItem>Modifier l'article</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
