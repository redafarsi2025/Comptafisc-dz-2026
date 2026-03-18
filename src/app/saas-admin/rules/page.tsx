
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  ShieldAlert, Plus, Trash2, Save, Play, 
  AlertCircle, AlertTriangle, Info, Search, Filter
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function BusinessRulesConfig() {
  const [rules, setRules] = React.useState([
    { id: 1, name: "Dividendes sans Retenue", condition: "Dividendes > 0 AND Retenue_Source == 0", severity: "high", active: true },
    { id: 2, name: "IRG Salarié Incorrect", condition: "IRG_Net != IRG_Barème_2026", severity: "high", active: true },
    { id: 3, name: "Stocks Négatifs", condition: "Stock_Value < 0", severity: "medium", active: true },
    { id: 4, name: "Seuil TAP Expatrié", condition: "Activite == SERVICE AND Chiffre_Affaires > 15M", severity: "low", active: false },
  ])

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <ShieldAlert className="text-primary h-8 w-8" /> Moteur de Règles Fiscale
          </h1>
          <p className="text-slate-400">Configurez les alertes automatiques pour vos abonnés PRO sans code.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle Règle
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-slate-950 border-slate-800 md:col-span-3">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle>Registre des Alertes Actives</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Filtrer les règles..." className="bg-slate-900 border-slate-800 pl-9 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-900/50">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Nom de la Règle</TableHead>
                  <TableHead className="text-slate-400">Condition Logique</TableHead>
                  <TableHead className="text-slate-400">Sévérité</TableHead>
                  <TableHead className="text-slate-400">Statut</TableHead>
                  <TableHead className="text-right text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell className="font-bold">{rule.name}</TableCell>
                    <TableCell className="font-mono text-[10px] text-primary">{rule.condition}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${rule.severity === 'high' ? 'border-destructive text-destructive bg-destructive/10' : ''}
                        ${rule.severity === 'medium' ? 'border-amber-500 text-amber-500 bg-amber-500/10' : ''}
                        ${rule.severity === 'low' ? 'border-blue-500 text-blue-500 bg-blue-500/10' : ''}
                      `}>
                        {rule.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell><Switch checked={rule.active} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Play className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none">
            <CardHeader>
              <CardTitle className="text-sm">Audit Temps Réel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">1,420</p>
              <p className="text-[10px] opacity-70">Anomalies détectées ce mois sur l'ensemble du parc client.</p>
              <Button className="w-full mt-4 bg-white text-primary hover:bg-white/90">Lancer l'audit global</Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase font-bold text-slate-500">Conformité Loi 2026</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-emerald-500" />
                <span>Barème IRG validé</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-emerald-500" />
                <span>Minimum IBS 10k validé</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-emerald-500" />
                <span>Suppression TAP validée</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
