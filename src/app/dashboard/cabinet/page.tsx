
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Layers, Users, AlertCircle, CheckCircle2, Clock, ExternalLink, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function CabinetDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = React.useState("")

  // Simulation: On cherche les dossiers où l'utilisateur est 'owner' ou 'accountant' via un cabinetId
  // Pour le prototype, on affiche tous les dossiers accessibles par l'utilisateur
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants, isLoading } = useCollection(tenantsQuery);

  const stats = React.useMemo(() => {
    if (!tenants) return { total: 0, upToDate: 0, pending: 0, late: 0 };
    return {
      total: tenants.length,
      upToDate: tenants.filter(t => t.onboardingComplete).length,
      pending: tenants.filter(t => !t.onboardingComplete).length,
      late: 0
    };
  }, [tenants]);

  const filteredTenants = React.useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => 
      t.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.nif?.includes(searchTerm)
    );
  }, [tenants, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Layers className="h-8 w-8 text-accent" /> Dashboard Cabinet
          </h1>
          <p className="text-muted-foreground text-sm">Vue consolidée du parc client et surveillance de la conformité.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Filtres Avancés</Button>
          <Button size="sm" className="bg-primary">Nouveau Dossier Client</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase font-bold opacity-80">Total Dossiers</p>
                <h2 className="text-3xl font-bold">{stats.total}</h2>
              </div>
              <Users className="h-8 w-8 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">À jour (G50/DAS)</p>
            <h2 className="text-3xl font-bold text-emerald-600">{stats.upToDate}</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Saisie en cours</p>
            <h2 className="text-3xl font-bold text-amber-600">{stats.pending}</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Échéances Dépassées</p>
            <h2 className="text-3xl font-bold text-destructive">{stats.late}</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Registre des Dossiers Gérés</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Chercher un client (Nom, NIF)..." 
                className="pl-9 h-9 w-72 bg-white" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Client / Raison Sociale</TableHead>
                <TableHead>Régime</TableHead>
                <TableHead>Statut Fiscal</TableHead>
                <TableHead>Dernière G50</TableHead>
                <TableHead>Alertes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12">Chargement du parc client...</TableCell></TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12">Aucun dossier trouvé.</TableCell></TableRow>
              ) : (
                filteredTenants.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/5">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{t.raisonSociale}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{t.nif || 'NIF NON RENSEIGNÉ'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase">{t.regimeFiscal}</Badge>
                    </TableCell>
                    <TableCell>
                      {t.onboardingComplete ? (
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> À JOUR
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600 font-bold text-[10px]">
                          <Clock className="h-3 w-3" /> ATTENTE PIÈCES
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium">Janvier 2026</TableCell>
                    <TableCell>
                      {!t.onboardingComplete && <Badge variant="destructive" className="h-4 text-[8px]">Profil Incomplet</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard?tenantId=${t.id}`} className="flex items-center gap-1">
                          Accéder <ExternalLink className="h-3 w-3" />
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
    </div>
  )
}
