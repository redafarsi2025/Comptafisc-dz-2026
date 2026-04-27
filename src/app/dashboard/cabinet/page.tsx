
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Layers, Users, AlertCircle, CheckCircle2, 
  Clock, ExternalLink, Filter, Search, 
  TrendingUp, ShieldCheck, Calculator, Landmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLocale } from "@/context/LocaleContext"
import { cn } from "@/lib/utils"

export default function CabinetDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const { t: trans, isRtl } = useLocale()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  // On cherche les dossiers où l'utilisateur est membre
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading } = useCollection(tenantsQuery);

  const stats = React.useMemo(() => {
    if (!tenants) return { total: 0, upToDate: 0, pending: 0, critical: 0 };
    return {
      total: tenants.length,
      upToDate: tenants.filter(t => t.onboardingComplete).length,
      pending: tenants.filter(t => !t.onboardingComplete).length,
      critical: tenants.filter(t => t.plan === 'GRATUIT' && !t.nif).length
    };
  }, [tenants]);

  const filteredTenants = React.useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => 
      t.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.nif?.includes(searchTerm)
    );
  }, [tenants, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-start">
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Layers className="text-accent h-8 w-8" /> {trans.Cabinet.master_dashboard}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">
            {trans.Cabinet.client_portfolio}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm">
            <Filter className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} /> Filtres Avancés
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest">
            {trans.Common.new_dossier}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="h-16 w-16 text-accent" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">{trans.Cabinet.active_folders}</p>
           <h2 className="text-3xl font-black">{stats.total} <span className="text-sm font-normal opacity-50">ENTITÉS</span></h2>
        </Card>
        
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{trans.Cabinet.audit_ready}</p>
           <h2 className="text-2xl font-black text-emerald-600">{stats.upToDate} dossiers</h2>
           <p className="text-[9px] text-muted-foreground mt-1">Dossiers juridiquement complets.</p>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Actions Comptables</p>
           <h2 className="text-2xl font-black text-amber-600">{stats.pending} en attente</h2>
        </Card>

        <Card className="bg-red-50 border-red-100 border border-l-4 border-l-red-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
             <AlertCircle className="h-6 w-6 text-red-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-red-800 uppercase leading-tight">{trans.Cabinet.compliance_alerts}</p>
             <p className="text-[11px] text-red-600 font-bold">{stats.critical} NIF Manquants</p>
           </div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-6 px-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tighter">Moniteur de Conformité Portefeuille</CardTitle>
          </div>
          <div className="relative">
            <Search className={cn("absolute top-3 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
            <Input 
              placeholder="Chercher client (Nom, NIF)..." 
              className={cn("h-10 w-80 rounded-xl bg-white text-xs shadow-sm", isRtl ? "pr-10" : "pl-10")} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[9px] uppercase font-black px-6 border-b h-12">
                <TableHead className="ps-8">Client / Raison Sociale</TableHead>
                <TableHead>Régime & Secteur</TableHead>
                <TableHead className="text-center">Santé Fiscale</TableHead>
                <TableHead className="text-center">Dernière G50</TableHead>
                <TableHead className="text-right pe-8">Actions Cabinet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic text-xs font-black uppercase opacity-20">Aucun dossier trouvé.</TableCell></TableRow>
              ) : (
                filteredTenants.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/5 group transition-colors h-20">
                    <TableCell className="ps-8">
                      <div className="flex flex-col">
                        <span className="font-black text-xs uppercase text-slate-900">{t.raisonSociale}</span>
                        <span className="text-[9px] text-muted-foreground font-mono font-bold mt-1">NIF: {t.nif || 'NON RENSEIGNÉ'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[8px] font-black h-4 px-2 uppercase bg-white border-primary/20 text-primary">{t.regimeFiscal}</Badge>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t.secteurActivite}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-emerald-600 tracking-tighter">88/100</span>
                           <TrendingUp className="h-3 w-3 text-emerald-500" />
                        </div>
                        <Progress value={88} className="w-16 h-1 bg-slate-100" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">Février 2026</span>
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-[8px] font-black text-emerald-600 uppercase">Déposée</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pe-8">
                      <Button variant="ghost" size="sm" className="h-8 rounded-xl font-black uppercase text-[10px] text-primary" asChild>
                        <Link href={`/dashboard?tenantId=${t.id}`}>
                          Ouvrir Dossier <ExternalLink className="ms-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-8 bg-slate-900 text-white rounded-3xl flex items-start gap-6 shadow-xl relative overflow-hidden">
        <ShieldCheck className="h-10 w-10 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-3 relative">
          <p className="font-black text-accent uppercase tracking-[0.2em]">Doctrine Cabinet Expert :</p>
          <p className="opacity-80 italic">
            "Le plan CABINET débloque la surveillance centralisée de vos dossiers. Chaque variation d'indice de conformité chez un client est notifiée au cabinet en temps réel. Cette version inclut également le moteur de rapprochement bancaire universel pour tous vos dossiers."
          </p>
        </div>
      </div>
    </div>
  )
}
