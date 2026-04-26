
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardList, Plus, Search, 
  FlaskConical, Beaker, Database, 
  TrendingDown, Calculator, ShieldCheck,
  ChevronRight, Loader2, Factory
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"

export default function IndustryRecipesPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const recipesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "recipes"), orderBy("createdAt", "desc")) : null
  , [db, tenantId]);
  const { data: recipes, isLoading } = useCollection(recipesQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <FlaskConical className="text-accent h-8 w-8" /> Fiches Recettes (BOM)
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Nomenclature des produits et calcul du prix de revient industriel</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}>
          <Plus className="mr-2 h-4 w-4" /> Créer une Nomenclature
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Recettes Indexées</p>
            <h2 className="text-3xl font-black text-primary">{recipes?.length || 0} fiches</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Optimisation Coûts</p>
            <h2 className="text-3xl font-black text-emerald-600">Active</h2>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200 border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-blue-800">Dernière mise à jour PAMP</p>
            <h2 className="text-3xl font-black text-blue-600">Aujourd'hui</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Catalogue des Nomenclatures</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Chercher un produit fini..." className="pl-9 h-9 w-64 bg-white text-xs" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>Produit Fini / Code</TableHead>
                <TableHead className="text-center">Composants</TableHead>
                <TableHead className="text-right">Coût Matière (DZD)</TableHead>
                <TableHead className="text-right">Charges Prod. (DZD)</TableHead>
                <TableHead className="text-right font-bold text-primary">Prix de Revient Final</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !recipes?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <Beaker className="h-12 w-12 opacity-10" />
                  <span>Aucune recette définie dans le système.</span>
                </TableCell></TableRow>
              ) : (
                recipes.map((recipe) => (
                  <TableRow key={recipe.id} className="hover:bg-muted/5 group transition-colors">
                    <TableCell className="text-xs font-bold">
                      <div className="flex flex-col">
                        <span>{recipe.productName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{recipe.code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">{recipe.components?.length || 0} articles</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{recipe.rawMaterialCost.toLocaleString()} DA</TableCell>
                    <TableCell className="text-right font-mono text-xs">{recipe.overheadCost.toLocaleString()} DA</TableCell>
                    <TableCell className="text-right font-black text-xs text-primary">{(recipe.rawMaterialCost + recipe.overheadCost).toLocaleString()} DA</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-t-4 border-t-primary shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Logiciel de Coût de Revient (Industrie)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Le moteur de calcul industriel de ComptaFisc-DZ agrège automatiquement le <strong>PAMP (Prix d'Achat Moyen Pondéré)</strong> de vos matières premières avec vos charges directes de personnel et frais d'énergie pour garantir une marge réelle.
            </p>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
               <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase">
                 <ShieldCheck className="h-4 w-4" /> Analyse Dynamique Activée
               </div>
               <p className="text-[10px] text-emerald-600 mt-1 italic">
                 Une hausse du prix du plastique (Polypropylène) de 5% impacterait votre coût de revient de 1.2 DA par unité.
               </p>
            </div>
          </CardContent>
        </Card>

        <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4">
          <Database className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="text-xs leading-relaxed space-y-2">
            <p className="font-bold text-blue-900 uppercase">Intégration SCF Classe 3 :</p>
            <p className="text-blue-800">
              La nomenclature industrielle est le pilier de la comptabilité analytique. Chaque Ordre de Fabrication (OF) génère les mouvements de stocks nécessaires : sortie des matières (31) et entrée des produits finis (35), avec régularisation de la variation de stock (603/72).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
