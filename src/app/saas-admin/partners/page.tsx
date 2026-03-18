
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, Plus, Search, TrendingUp, Handshake, Star
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ResellerPartners() {
  const partners = [
    { id: 1, name: "Expert-Compta Alge-Nord", type: "Prescripteur", referrals: 45, status: "Gold", revenue: "120,000 DA" },
    { id: 2, name: "Solutions RH DZ", type: "Revendeur", referrals: 12, status: "Silver", revenue: "45,000 DA" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Briefcase className="text-accent h-8 w-8" /> Partenaires
          </h1>
          <p className="text-muted-foreground">Réseau de distribution et prescripteurs certifiés.</p>
        </div>
        <Button className="bg-primary shadow-lg"><Plus className="mr-2 h-4 w-4" /> Nouveau Partenaire</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="md:col-span-3 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Réseau Actif</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-9 w-64 bg-background" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="font-bold text-sm">{p.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{p.type}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-emerald-500" /><span className="font-bold text-sm">{p.referrals} clients</span></div></TableCell>
                    <TableCell><div className="flex items-center gap-1 text-amber-500 font-bold text-xs"><Star className="h-3 w-3 fill-current" /> {p.status}</div></TableCell>
                    <TableCell className="text-right font-black text-primary">{p.revenue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-t-4 border-t-primary shadow-lg">
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> Programme Partenaire</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Marge Revendeur</p>
                <p className="text-2xl font-black text-emerald-700">25%</p>
              </div>
              <Button className="w-full bg-primary">Paramètres Commissions</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
