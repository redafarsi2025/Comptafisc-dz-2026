"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Anchor, Plus, Save, Trash2, Edit3, 
  Loader2, RefreshCcw, ShieldCheck, Gavel, 
  Settings2, Zap, Info, Search, DatabaseZap, ListChecks
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function CustomsConfigAdmin() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isParamsOpen, setIsParamsOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  // 1. Paramètres globaux (TCS, PRCT)
  const customsParamsRef = useMemoFirebase(() => db ? doc(db, "system_config", "customs_params") : null, [db]);
  const { data: liveParams } = useDoc(customsParamsRef);

  const currentParams = React.useMemo(() => ({
    tcs_rate: liveParams?.tcs_rate ?? 0.03,
    prct_rate: liveParams?.prct_rate ?? 0.02,
  }), [liveParams]);

  const [editParams, setEditParams] = React.useState(currentParams);
  React.useEffect(() => { setEditParams(currentParams); }, [currentParams]);

  // 2. Référentiel SH10
  const tariffsQuery = useMemoFirebase(() => db ? query(collection(db, "customs_tariffs"), orderBy("code", "asc")) : null, [db]);
  const { data: tariffs, isLoading } = useCollection(tariffsQuery);

  const filteredTariffs = React.useMemo(() => {
    if (!tariffs) return [];
    return tariffs.filter(t => t.code.includes(searchTerm) || t.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tariffs, searchTerm]);

  const handleSaveParams = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDocumentNonBlocking(doc(db, "system_config", "customs_params"), {
        ...editParams,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Paramètres douaniers mis à jour" });
      setIsParamsOpen(false);
    } finally { setIsSaving(false); }
  }

  const handleInitializeDefaults = async () => {
    if (!db) return;
    setIsInitializing(true);
    const defaults = [
      { code: '8471300000', label: 'Ordinateurs Portables', duty: 5, daps: 0, tva: 19 },
      { code: '8517130000', label: 'Smartphones', duty: 30, daps: 30, tva: 19 },
      { code: '3004900000', label: 'Médicaments', duty: 5, daps: 0, tva: 9 },
      { code: '1001190000', label: 'Blé Dur', duty: 5, daps: 0, tva: 0 },
    ];
    try {
      for (const t of defaults) {
        await setDocumentNonBlocking(doc(db, "customs_tariffs", t.code), { ...t, isActive: true, updatedAt: new Date().toISOString() }, { merge: true });
      }
      toast({ title: "Nomenclature SH10 initialisée" });
    } finally { setIsInitializing(false); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20 text-start">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Anchor className="text-accent h-10 w-10" /> Configuration Douane
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest">Pilotage du noyau de liquidation et nomenclature SH10</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitializeDefaults} disabled={isInitializing} className="rounded-2xl border-slate-200 bg-white font-bold h-11 px-6 shadow-sm">
             {isInitializing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
             Reset SH10
          </Button>
          
          <Dialog open={isParamsOpen} onOpenChange={setIsParamsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 shadow-xl rounded-2xl h-11 px-8 font-black uppercase text-[10px] tracking-widest text-white">
                <Settings2 className="mr-2 h-4 w-4 text-accent" /> Taux Parafiscaux
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Paramètres de Liquidation</DialogTitle>
                <DialogDescription>Taux appliqués sur l'ensemble du SaaS.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label>TCS (Taxe de Conformité sur les Services)</Label>
                  <div className="relative">
                    <Input type="number" step="0.001" value={editParams.tcs_rate} onChange={e => setEditParams({...editParams, tcs_rate: parseFloat(e.target.value)})} className="pr-12 font-black" />
                    <span className="absolute right-3 top-2.5 font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>PRCT (Prélèvement à la Réception)</Label>
                  <div className="relative">
                    <Input type="number" step="0.001" value={editParams.prct_rate} onChange={e => setEditParams({...editParams, prct_rate: parseFloat(e.target.value)})} className="pr-12 font-black" />
                    <span className="absolute right-3 top-2.5 font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveParams} disabled={isSaving} className="w-full">Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" /> Nomenclature SH10 Live
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input placeholder="Rechercher code..." className="pl-10 h-10 w-64 rounded-2xl bg-white border-slate-200 shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
           </div>
           
           <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase pl-8">Code SH10</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Désignation</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase">DD / DAPS</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase">TVA</TableHead>
                    <TableHead className="text-right pr-8 font-black text-[10px] uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredTariffs.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50 transition-colors group">
                      <TableCell className="pl-8 font-mono text-xs font-bold text-primary">{t.code}</TableCell>
                      <TableCell className="font-bold text-xs uppercase text-slate-900">{t.label}</TableCell>
                      <TableCell className="text-center">
                         <div className="flex flex-col gap-1">
                           <Badge className="bg-blue-100 text-blue-700 border-none h-4 text-[8px] mx-auto">DD: {t.duty}%</Badge>
                           {t.daps > 0 && <Badge className="bg-amber-100 text-amber-700 border-none h-4 text-[8px] mx-auto">DAPS: {t.daps}%</Badge>}
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] font-black h-5">{t.tva}%</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "customs_tariffs", t.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl p-6 relative overflow-hidden group">
              <DatabaseZap className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent group-hover:scale-110 transition-transform" />
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Moteur de Synchro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <p className="text-xs leading-relaxed opacity-80 italic">
                  "Le module Douane est désormais piloté par métadonnées. Toute modification des taux TCS/PRCT est répercutée instantanément sur les simulateurs de tous les clients."
                </p>
                <div className="pt-6 border-t border-white/10 space-y-4">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-slate-400">TCS Active</span>
                      <span className="text-accent">{(currentParams.tcs_rate * 100).toFixed(1)}%</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-slate-400">PRCT Active</span>
                      <span className="text-accent">{(currentParams.prct_rate * 100).toFixed(1)}%</span>
                   </div>
                </div>
              </CardContent>
           </Card>

           <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-4">
              <Info className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
              <div className="text-[10px] text-blue-900 leading-relaxed font-medium">
                <p className="font-black uppercase tracking-tight mb-1">Base Légale 2026 :</p>
                <p className="opacity-80">
                  La nomenclature SH10 (10 chiffres) est la norme depuis l'éclatement tarifaire de 2024. Le système supporte les 15 000+ sous-positions potentielles.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
