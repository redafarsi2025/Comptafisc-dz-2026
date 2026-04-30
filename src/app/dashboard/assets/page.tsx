
import { promises as fs } from 'fs';
import path from 'path';
import { Metadata } from 'next';
import { z } from 'zod';

import { columns } from '@/components/data-table/asset-columns';
import { DataTable } from '@/components/data-table/data-table';
import { assetSchema } from '@/components/data-table/asset-data';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Gestion des Actifs',
  description: 'Suivez et gérez les immobilisations de votre entreprise.',
};

async function getAssets() {
  const data = await fs.readFile(
    path.join(process.cwd(), 'src/components/data-table/asset-data.json')
  );

  const assets = JSON.parse(data.toString());

  return z.array(assetSchema).parse(assets);
}

export default async function AssetsPage() {
  const assets = await getAssets();

  return (
    <div className='container mx-auto py-10'>
      <PageHeader>
        <PageHeaderHeading>Gestion des Actifs</PageHeaderHeading>
        <PageHeaderDescription>
          Suivez, amortissez et gérez le cycle de vie de vos immobilisations.
        </PageHeaderDescription>
      </PageHeader>
      <DataTable columns={columns} data={assets} />
    </div>
  );
}
