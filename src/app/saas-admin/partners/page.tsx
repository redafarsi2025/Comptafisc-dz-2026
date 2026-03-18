
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, Plus, Search, Mail, Phone, 
  ExternalLink, TrendingUp, Handshake, Star
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ResellerPartners() {
  const partners = [
    { id: 1, name: "Expert-Compta Alge-Nord", type: "Prescripteur", referrals: 45, status: "Gold", revenue: "120,000 DA" },
    { id: 2, name: "Solutions RH DZ", type: "Revendeur", referrals: 12, status: "Silver", revenue: "45,000 DA" },
    { id: 3, name: "Fiduciaire Oran", type: "Prescripteur", referrals: 28, status: "Silver", revenue: "82,000 DA" },
    { id: 4, name: "IT Audit Sahara", type: "Revendeur", referrals: 5, status: "Bronze", revenue: "15,000 DA" },
  ]

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Briefcase className="text-primary h-8 w-8" /> Partenaires & Revendeurs
          </h1>
          <p className="text-slate-400">Gérez votre réseau de distribution et d'experts-comptables certifiés.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nouveau Partenaire
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-slate-950 border-slate-800 md:col-span-3">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle>Réseau de Distribution</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Chercher un partenaire..." className="bg-slate-900 border-slate-800 pl-9 w-64 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-900/50">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Nom du Partenaire</TableHead>
                  <TableHead className="text-slate-400">Type</TableHead>
                  <TableHead className="text-slate-400">Parrainages</TableHead>
                  <TableHead className="text-slate-400">Statut Program</TableHead>
                  <TableHead className="text-right text-slate-400">Commission Générée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => (
                  <TableRow key={p.id} className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell className="font-bold">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400">
                        {p.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="font-bold">{p.referrals} clients</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className={`h-3 w-3 ${p.status === 'Gold' ? 'text-amber-400' : 'text-slate-500'}`} fill="currentColor" />
                        <span className="text-xs font-bold">{p.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-white">{p.revenue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Handshake className="h-4 w-4 text-primary" /> Programme Partenaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Commission Prescripteur</p>
                <p className="text-xl font-black">15%</p>
                <p className="text-[10px] text-slate-400 mt-1 italic">Sur chaque abonnement payant référé.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Marge Revendeur</p>
                <p className="text-xl font-black">25%</p>
                <p className="text-[10px] text-slate-400 mt-1 italic">Sur l'achat de licences en volume.</p>
              </div>
              <Button className="w-full bg-slate-800 text-white hover:bg-slate-700">Paramètres Commissions</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
