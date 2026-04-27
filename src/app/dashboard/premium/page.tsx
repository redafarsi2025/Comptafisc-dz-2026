"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from "@/firebase"
import { collection, doc, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, Zap, Database, Users, 
  CheckCircle2, Loader2, ArrowRight, ShieldCheck,
  ShoppingBag, Star, Crown, Info, Landmark
} from "lucide-react"
import { PREMIUM_ADDONS, AddonService } from "@/lib/plans"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function PremiumMarketplace() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null)

  React.useEffect(() => { setMounted(true) }, [])

  const tenantRef = useMemoFirebase(() => (db && tenantId) ? doc(db, "tenants", tenantId) : null, [db, tenantId]);
  const { data: tenant } = useDoc(tenantRef);

  const handleActivateAddon = async (addon: AddonService) => {
    if (!db || !tenantId) return;
    setIsProcessing(addon.id);

    try {
      const activeAddons = tenant?.activeAddons || [];
      if (activeAddons.includes(addon.id)) {
        toast({ title: "Déjà actif", description: "Ce service est déjà activé sur votre dossier." });
        return;
      }

      await updateDocumentNonBlocking(doc(db, "tenants", tenantId), {
        activeAddons: [...activeAddons, addon.id],
        updatedAt: new Date().toISOString()
      });

      toast({ 
        title: "Service activé", 
        description: `${addon.name} est maintenant disponible.`,
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur d'activation" });
    } finally {
      setIsProcessing(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <ShoppingBag className="text-accent h-10 w-10" /> Services Premium
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em] mt-2">Boostez votre dossier indépendamment de votre pack de base</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-slate-900 text-accent border-none px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-xl">
            <Crown className="h-3 w-3 mr-2 text-accent" /> Mode Performance Actif
          </Badge>
        </div>
      </div>

      {tenant?.plan === 'CABINET' && (
        <Card className="bg-purple-50 border-purple-200 border-l-4 border-l-purple-500 rounded-3xl overflow-hidden shadow-sm">
           <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                 <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center shadow-inner border border-purple-100">
                    <Star className="h-8 w-8 text-purple-600 fill-purple-600" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-purple-900 uppercase tracking-tighter">Offre Spéciale Cabinet</h3>
                    <p className="text-sm text-purple-700 font-medium">Votre accès est offert par votre comptable. Vous pouvez souscrire ici à des options exclusives.</p>
                 </div>
              </div>
           </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {PREMIUM_ADDONS.map((addon) => {
          const isActive = tenant?.activeAddons?.includes(addon.id);
          const IconComp = addon.id === 'OCR_UNLIMITED' ? Zap : addon.id === 'STORAGE_100GB' ? Database : addon.id === 'PAYROLL_PRO' ? Users : Sparkles;

          return (
            <Card key={addon.id} className={cn(
              "flex flex-col border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden transition-all duration-300 group hover:scale-[1.03] hover:shadow-2xl",
              isActive ? "bg-slate-50 ring-emerald-200" : "bg-white"
            )}>
              <CardHeader className="pb-6">
                 <div className={cn(
                   "h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-12",
                   isActive ? "bg-emerald-100 text-emerald-600" : "bg-primary/5 text-primary"
                 )}>
                    <IconComp className="h-7 w-7" />
                 </div>
                 <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tighter">{addon.name}</CardTitle>
                 <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-primary">{addon.price.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DA/mois</span>
                 </div>
                 <CardDescription className="text-xs mt-4 font-medium leading-relaxed">{addon.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                 <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase">
                       <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Activation immédiate
                    </li>
                    <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase">
                       <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Sans engagement
                    </li>
                 </ul>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                 {isActive ? (
                   <Button disabled className="w-full bg-emerald-500 text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-[0.2em]">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Service Actif
                   </Button>
                 ) : (
                   <Button 
                    onClick={() => handleActivateAddon(addon)} 
                    disabled={isProcessing === addon.id}
                    className="w-full bg-primary shadow-lg shadow-primary/20 rounded-xl h-12 font-black uppercase text-[10px] tracking-[0.2em]"
                   >
                      {isProcessing === addon.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      Souscrire
                   </Button>
                 )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
         <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
            <div className="relative space-y-6">
               <h4 className="text-2xl font-black uppercase tracking-tighter">Pourquoi passer au Premium ?</h4>
               <p className="text-sm text-slate-400 leading-relaxed font-medium">
                 Le plan offert par votre cabinet couvre vos besoins comptables de base. Les services Premium vous permettent de transformer votre ERP en un véritable outil de pilotage stratégique et d'automatisation totale.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-[10px] font-black text-accent uppercase mb-1">Gain de Temps</p>
                     <p className="text-[10px] opacity-60">L'IA automatise 90% des saisies manuelles répétitives.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Sécurité Fiscale</p>
                     <p className="text-[10px] opacity-60">Audit permanent de conformité sur chaque écriture.</p>
                  </div>
               </div>
            </div>
         </Card>

         <div className="p-8 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-6">
            <ShieldCheck className="h-10 w-10 text-blue-600 shrink-0 mt-1" />
            <div className="text-xs text-blue-900 leading-relaxed space-y-4">
              <p className="font-black text-blue-800 uppercase tracking-widest">Certification Jibayatic 2026 :</p>
              <p className="font-medium">
                "Les add-ons Premium incluent les mises à jour automatiques des connecteurs fiscaux. Le module Paie Pro génère des fichiers XML validés par les automates de la DGI et de la CNAS, garantissant un dépôt sans erreurs."
              </p>
              <div className="bg-white/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                 <Info className="h-4 w-4 text-blue-400" />
                 <span className="italic">Le montant des services est prélevé mensuellement sur votre moyen de paiement configuré.</span>
              </div>
            </div>
         </div>
      </div>
    </div>
  )
}

function PlusCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  )
}
