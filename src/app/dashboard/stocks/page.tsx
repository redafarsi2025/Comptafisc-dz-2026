
import { promises as fs } from 'fs';
import path from 'path';
import { Metadata } from 'next';
import { z } from 'zod';

import { columns } from '@/components/data-table/stock-columns';
import { DataTable } from '@/components/data-table/data-table';
import { stockSchema } from '@/components/data-table/stock-data';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Gestion des Stocks',
  description: 'Suivez et gérez les stocks de votre entreprise.',
};

async function getStocks() {
  const data = await fs.readFile(
    path.join(process.cwd(), 'src/components/data-table/stock-data.json')
  );

  const stocks = JSON.parse(data.toString());

  return z.array(stockSchema).parse(stocks);
}

export default async function StocksPage() {
  const stocks = await getStocks();

  return (
    <div className='container mx-auto py-10'>
      <PageHeader>
        <PageHeaderHeading>Gestion des Stocks</PageHeaderHeading>
        <PageHeaderDescription>
          Suivez les entrées, les sorties et la valorisation de vos stocks en temps réel.
        </PageHeaderDescription>
      </PageHeader>
      <DataTable columns={columns} data={stocks} />
    </div>
  );
}
