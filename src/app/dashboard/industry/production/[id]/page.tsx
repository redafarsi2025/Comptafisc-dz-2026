
"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Factory, ChevronLeft, Settings, 
  PlayCircle, CheckCircle2, AlertTriangle, 
  Loader2, History, Database, ShieldCheck,
  Zap, Package, Layers, Info, Trash2
} from "lucide-react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function ProductionOrderDetailPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { id } = useParams()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const orderRef = useMemoFirebase(() => 
    (db && tenantId && id) ? doc(db, "tenants", tenantId, "production_orders", id as string) : null
  , [db, tenantId, id]);
  const { data: order, isLoading } = useDoc(orderRef);

  const handleStartProduction = async () => {
    if (!db || !tenantId || !id) return;
    setIsProcessing(true);
    try {
      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "production_orders", id as string), {
        status: "RUNNING",
        progress: 10,
        startedAt: new Date().toISOString()
      });
      toast({ title: "Production démarrée", description: "La ligne est maintenant active." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteProduction = async () => {
    if (!db || !tenantId || !id || !order) return;
    setIsProcessing(true);
    try {
      // 1. Mettre à jour le statut de l'OF
      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "production_orders", id as string), {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date().toISOString()
      });

      // 2. Logique de mouvement de stock (Moteur industriel Master)
      // Normalement ici, on boucle sur les composants de la recette
      // Mais dans le prototype, on simule l'incrément du produit fini
      if (order.productId) {
        const productRef = doc(db, "tenants", tenantId, "products", order.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().theoreticalStock || 0;
          await updateDocumentNonBlocking(productRef, {
            theoreticalStock: currentStock + order.targetQty,
            updatedAt: new Date().toISOString()
          });
        }
      }

      toast({ 
        title: "Production clôturée", 
        description: `Le stock de ${order.productName} a été incrémenté de ${order.targetQty} ${order.unit}.` 
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur clôture" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
  if (!order) return <div className="p-20 text-center">Ordre non trouvé.</div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/industry/production?tenantId=${tenantId}`}><ChevronLeft className="h-5 w-5" /></Link></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">{order.orderNumber || 'OF-XXXX'}</h1>
              <Badge className={
                order.status === 'RUNNING' ? 'bg-blue-500' : 
                order.status === 'COMPLETED' ? 'bg-emerald-500' : 
                'bg-slate-400'
              }>
                {order.status === 'RUNNING' ? 'EN PRODUCTION' : order.status === 'PLANNED' ? 'PLANIFIÉ' : 'TERMINÉ'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Dossier technique de fabrication industrielle</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'PLANNED' && (
            <Button onClick={handleStartProduction} disabled={isProcessing} className="bg-primary shadow-xl rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest">
              <PlayCircle className="mr-2 h-5 w-5" /> Démarrer la Ligne
            </Button>
          )}
          {order.status === 'RUNNING' && (
            <Button onClick={handleCompleteProduction} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 shadow-xl rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest">
              <CheckCircle2 className="mr-2 h-5 w-5" /> Terminer & Entrée Stock
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Factory className="h-16 w-16" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Cible de Production</p>
           <h2 className="text-3xl font-black">{order.targetQty} <span className="text-xs font-normal opacity-50">{order.unit}</span></h2>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Produit Fini</p>
           <h2 className="text-lg font-black text-slate-900 truncate uppercase">{order.productName}</h2>
           <p className="text-[9px] text-muted-foreground mt-1 font-bold">Réf: {order.productId.substring(0,8)}</p>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Avancement Réel</p>
           <h2 className="text-3xl font-black text-primary tracking-tighter">{order.progress}%</h2>
           <Progress value={order.progress} className="h-1.5 mt-2" />
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Valorisation SCF</p>
             <p className="text-[11px] text-emerald-600 font-medium">Entrée au PAMP calculé</p>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
             <CardHeader className="bg-slate-50 border-b">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                 <History className="h-4 w-4 text-primary" /> Journal de la Ligne
               </CardTitle>
             </CardHeader>
             <CardContent className="p-8">
                <div className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold uppercase tracking-tight">Phase de préparation</p>
                          <time className="text-[9px] font-mono text-slate-400">{new Date(order.createdAt).toLocaleString()}</time>
                        </div>
                        <p className="text-[11px] text-slate-500 italic leading-relaxed">Génération de l'OF et affectation de la nomenclature technique.</p>
                      </div>
                   </div>
                   
                   {order.startedAt && (
                     <div className="flex items-center gap-4 border-l-2 border-dashed border-blue-200 ml-5 pl-8 py-2">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0 -ml-13">
                          <PlayCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-bold uppercase tracking-tight">Lancement en fabrication</p>
                            <time className="text-[9px] font-mono text-slate-400">{new Date(order.startedAt).toLocaleString()}</time>
                          </div>
                          <p className="text-[11px] text-slate-500 italic leading-relaxed">Engagement des matières premières et lancement des machines.</p>
                        </div>
                     </div>
                   )}

                   {order.completedAt && (
                     <div className="flex items-center gap-4 border-l-2 border-dashed border-emerald-200 ml-5 pl-8 py-2">
                        <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0 -ml-13">
                          <CheckCircle2 className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-bold uppercase tracking-tight">Clôture & Entrée en Stock</p>
                            <time className="text-[9px] font-mono text-slate-400">{new Date(order.completedAt).toLocaleString()}</time>
                          </div>
                          <p className="text-[11px] text-slate-500 italic leading-relaxed">Confirmation des quantités réelles et mise à jour de l'inventaire permanent (Classe 35).</p>
                        </div>
                     </div>
                   )}
                </div>
             </CardContent>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="bg-white border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
             <CardHeader className="bg-slate-50 border-b p-4">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Informations Ligne</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Statut Automate</p>
                    <p className="text-sm font-bold text-slate-900">{order.status === 'RUNNING' ? 'Ligne en fonctionnement' : 'Ligne à l\'arrêt'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Database className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Impact Stock (35)</p>
                    <p className="text-sm font-bold text-slate-900">+{order.targetQty} {order.unit}</p>
                  </div>
                </div>
             </CardContent>
           </Card>

           <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4">
             <Info className="h-6 w-6 text-accent shrink-0 mt-1" />
             <div className="text-[11px] leading-relaxed opacity-80 italic">
               "Note : La variation de stock (Comptes 72 / 603) est calculée à la clôture de l'OF pour garantir la conformité de vos futurs États Financiers."
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
