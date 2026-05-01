
'use client'

import * as React from 'react'
import { useTenant, useFirestore } from '@/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { DollarSign, EyeOff, PlusCircle, AlertTriangle, Layers, Building, Loader2, Info } from 'lucide-react'
import { Budget, BudgetLine, BudgetSection } from '@/models/budget.models'
import { cn } from '@/lib/utils'
import { getBudgetByTenant, FullBudgetData } from '@/services/budget.service'

// --- UI Components ---

const SectionButton = ({ type, label, isSelected, onClick }: {
  type: 'fonctionnement' | 'investissement';
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2',
      isSelected ? 'bg-primary text-primary-foreground shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
    )}
  >
    {type === 'fonctionnement' ? <Layers className="h-4 w-4" /> : <Building className="h-4 w-4" />}
    {label}
  </button>
);

const BudgetTable = ({ lines }: { lines: BudgetLine[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className='w-[100px]'>Compte</TableHead>
        <TableHead>Libellé</TableHead>
        <TableHead className='text-right'>Alloué</TableHead>
        <TableHead className='text-right'>Engagé</TableHead>
        <TableHead className='text-right'>Consommé</TableHead>
        <TableHead className='w-[200px] text-center'>Disponible</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {lines.map((line) => {
        const remaining = line.allocatedAmount - line.committedAmount;
        const progress = line.allocatedAmount > 0 ? (line.committedAmount / line.allocatedAmount) * 100 : 0;

        return (
          <TableRow key={line.id}>
            <TableCell className="font-mono font-semibold">{line.accountCode}</TableCell>
            <TableCell>{line.label}</TableCell>
            <TableCell className="text-right font-medium">{line.allocatedAmount.toLocaleString('fr-DZ')} DA</TableCell>
            <TableCell className="text-right text-orange-600 font-semibold">{line.committedAmount.toLocaleString('fr-DZ')} DA</TableCell>
            <TableCell className="text-right text-red-600 font-semibold">{line.consumedAmount.toLocaleString('fr-DZ')} DA</TableCell>
            <TableCell>
              <div className='flex flex-col items-center space-y-1'>
                <span className={`font-bold text-sm ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining.toLocaleString('fr-DZ')} DA
                </span>
                <Progress value={progress} className='h-2' indicatorClassName={progress > 90 ? 'bg-red-500' : 'bg-orange-500'} />
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

const PlaceholderCard = ({ icon, title, message }: { icon: React.ElementType, title: string, message: string }) => {
  const Icon = icon;
  return (
    <Card className='flex flex-col items-center justify-center p-12 text-center border-dashed'>
        <Icon className="h-12 w-12 text-slate-300" />
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </Card>
  )
}

// --- Main Page Component ---

export default function BudgetPage() {
  const { currentTenant } = useTenant();
  const db = useFirestore();
  const [budgetData, setBudgetData] = React.useState<FullBudgetData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedSectionType, setSelectedSectionType] = React.useState<'fonctionnement' | 'investissement'>('fonctionnement');

  React.useEffect(() => {
    if (currentTenant?.isPublicSector && db) {
      const fiscalYear = new Date().getFullYear();
      setIsLoading(true);
      getBudgetByTenant(db, currentTenant.id, fiscalYear)
        .then(data => {
          setBudgetData(data);
        })
        .catch(error => {
          console.error("Erreur lors de la récupération du budget:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [currentTenant, db]);

  if (!currentTenant?.isPublicSector) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <EyeOff className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold">Module non disponible</h2>
        <p className="mt-2 text-sm text-muted-foreground">La gestion budgétaire est une fonctionnalité réservée aux établissements du secteur public.</p>
      </div>
    );
  }

  const displayedLines = budgetData?.lines.filter(
    line => line.sectionId === budgetData.sections.find(s => s.type === selectedSectionType)?.id
  ) || [];
  
  const selectedSection = budgetData?.sections.find(s => s.type === selectedSectionType);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className='flex flex-col gap-1 text-start'>
          <h1 className='text-3xl font-black text-primary flex items-center gap-2 uppercase tracking-tighter'>
            <DollarSign className='h-8 w-8' />
            Gestion Budgétaire
          </h1>
          <p className='text-muted-foreground font-medium uppercase text-[10px] tracking-widest'>Exercice {new Date().getFullYear()}</p>
        </div>
        <Button className='shadow-lg bg-primary h-11 px-6 rounded-xl font-bold'>
          <PlusCircle className='mr-2 h-4 w-4' />
          Planifier le Budget
        </Button>
      </div>

      {isLoading ? (
        <PlaceholderCard icon={Loader2} title="Chargement du budget..." message="Récupération des données en cours, veuillez patienter."/>
      ) : budgetData ? (
        <>
          <Card className="bg-slate-50 border-none rounded-2xl p-2">
            <div className="flex items-center gap-2">
              {budgetData.sections.map(sec => (
                <SectionButton 
                  key={sec.id} 
                  type={sec.type} 
                  label={sec.label} 
                  isSelected={selectedSectionType === sec.type}
                  onClick={() => setSelectedSectionType(sec.type)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lignes Budgétaires - {selectedSection?.label}</CardTitle>
              <CardDescription>Suivi des crédits alloués, engagés et consommés pour la section.</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetTable lines={displayedLines} />
            </CardContent>
          </Card>
        </>
      ) : (
        <PlaceholderCard icon={Info} title="Budget non trouvé" message={`Aucun budget n'a été défini pour l'année ${new Date().getFullYear()}. Cliquez sur 'Planifier le Budget' pour commencer.`}/>
      )}

      <div className="p-4 bg-amber-50 text-amber-900 rounded-2xl flex items-start gap-4 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold">Comment ça marche ?</h4>
            <p className="text-xs leading-relaxed mt-1">
              Le montant <strong className="text-orange-700">Engagé</strong> est mis à jour par les bons de commande. Le montant <strong className="text-red-700">Consommé</strong> est mis à jour par les factures fournisseurs. Le <strong className="text-green-700">Disponible</strong> est la différence entre l'Alloué et l'Engagé.
            </p>
          </div>
      </div>
    </div>
  );
}
