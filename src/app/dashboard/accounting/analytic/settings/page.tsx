/**
 * @fileOverview Paramétrage des Axes et Sections Analytiques.
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Layers, Plus, Search, Settings2, 
  Database, ShieldCheck, Loader2, 
  Trash2, Edit3, ChevronRight, FolderTree
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function AnalyticSettings() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [activeAxeId, setActiveAxeId] = React.useState<string | null>(null)

  const [newAxe, setNewAxe] = React.useState({ code: "", libelle: "", obligatoire: false })
  const [newSection, setNewSection] = React.useState({ code: "", libelle: "" })

  React.useEffect(() => { setMounted(true) }, [])

  const axesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "axesAnalytiques"), orderBy("ordre", "asc")) : null
  , [db, tenantId]);
  const { data: axes, isLoading: isAxesLoading } = useCollection(axesQuery);

  const sectionsQuery = useMemoFirebase(() => 
    (db && tenantId && activeAxeId) ? query(collection(db, "tenants", tenantId, "sectionsAnalytiques"), orderBy("code", "asc")) : null
  , [db, tenantId, activeAxeId]);
  const { data: sections, isLoading: isSectionsLoading } = useCollection(sectionsQuery);

  const handleAddAxe = async () => {
    if (!db || !tenantId || !newAxe.code) return;
    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "axesAnalytiques"), {
        ...newAxe,
        ordre: (axes?.length || 0) + 1,
        actif: true,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Axe créé", description: `L'axe ${newAxe.code} est actif.` });
      setNewAxe({ code: "", libelle: "", obligatoire: false });
    } catch (e) { console.error(e); }
  }

  const handleAddSection = async () => {
    if (!db || !tenantId || !activeAxeId || !newSection.code) return;
    const axe = axes?.find(a => a.id === activeAxeId);
    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "sectionsAnalytiques"), {
        ...newSection,
        axeId: activeAxeId,
        axeCode: axe?.code,
        actif: true,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Section ajoutée", description: `Centre de coût ${newSection.code} prêt.` });
      setNewSection({ code: "", libelle: "" });
    } catch (e) { console.error(e); }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 uppercase tracking-tighter">
            <Settings2 className="text-accent h-8 w-8" /> Architecture Analytique
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Structure Master - Centres de coûts & Projets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AXES ANALYTIQUES */}
        <Card className="lg:col-span-1 shadow-xl border-none ring-1 ring-border bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Axes Analytiques</CardTitle>
            </div>
            <Dialog>
              <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-primary"><Plus className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvel Axe de Analyse</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label>Code (CC, PRJ...)</Label><Input value={newAxe.code} onChange={e => setNewAxe({...newAxe, code: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Libellé</Label><Input value={newAxe.libelle} onChange={e => setNewAxe({...newAxe, libelle: e.target.value})} /></div>
                </div>
                <DialogFooter><Button onClick={handleAddAxe} className="w-full">Créer l'Axe</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {isAxesLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary h-6 w-6" /></div> : axes?.map(a => (
                <button 
                  key={a.id} 
                  onClick={() => setActiveAxeId(a.id)}
                  className={cn(
                    "w-full p-6 text-left hover:bg-slate-50 transition-all flex items-center justify-between group",
                    activeAxeId === a.id ? "bg-primary/5 border-l-4 border-l-primary" : ""
                  )}
                >
                  <div>
                    <p className="text-xs font-black uppercase text-slate-900">{a.libelle}</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-1 uppercase">CODE: {a.code}</p>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", activeAxeId === a.id ? "text-primary translate-x-1" : "text-slate-200")} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SECTIONS / CENTRES DE COUTS */}
        <Card className="lg:col-span-2 shadow-2xl border-none ring-1 ring-border bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest">
                  {axes?.find(a => a.id === activeAxeId)?.libelle || "Sections Analytiques"}
                </CardTitle>
                <CardDescription className="text-[9px] font-bold uppercase text-slate-400">Centres de coûts et profits rattachés</CardDescription>
              </div>
            </div>
            {activeAxeId && (
              <Dialog>
                <DialogTrigger asChild><Button size="sm" className="h-9 px-4 rounded-xl"><Plus className="h-4 w-4 mr-2" /> Nouvelle Section</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ajouter un Centre de Coût</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Code Section</Label><Input value={newSection.code} onChange={e => setNewSection({...newSection, code: e.target.value})} /></div>
                    <div className="grid gap-2"><Label>Libellé complet</Label><Input value={newSection.libelle} onChange={e => setNewSection({...newSection, libelle: e.target.value})} /></div>
                  </div>
                  <DialogFooter><Button onClick={handleAddSection} className="w-full">Valider la Section</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!activeAxeId ? (
              <div className="py-32 text-center text-slate-400 italic text-sm">
                Sélectionnez un axe à gauche pour gérer ses sections.
              </div>
            ) : isSectionsLoading ? (
              <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary h-8 w-8" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="text-[9px] uppercase font-black">
                    <TableHead className="pl-8">Code Section</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections?.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50 group">
                      <TableCell className="pl-8 font-mono text-xs font-bold text-primary">{s.code}</TableCell>
                      <TableCell className="text-xs font-medium uppercase text-slate-600">{s.libelle}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-500 text-white text-[8px] font-black tracking-widest h-5">ACTIF</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "tenants", tenantId!, "sectionsAnalytiques", s.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-6 shadow-xl">
        <ShieldCheck className="h-10 w-10 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-3">
          <p className="font-black text-accent uppercase tracking-[0.2em]">Doctrine Analytique SCF :</p>
          <p className="opacity-80">
            Le découpage en <strong>Axes</strong> (Nature du coût) et <strong>Sections</strong> (Lieu de responsabilité) permet d'isoler les marges par projet ou atelier. 
            Conformément à la Loi de Finances 2026, cette structure est indispensable pour justifier les investissements réinvestis lors du calcul de l'IBS réduit.
          </p>
        </div>
      </div>
    </div>
  )
}
