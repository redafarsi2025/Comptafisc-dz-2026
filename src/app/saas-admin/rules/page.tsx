
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  ShieldAlert, Plus, Trash2, Play, 
  AlertCircle, Search
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function BusinessRulesConfig() {
  const [rules, setRules] = React.useState([
    { id: 1, name: "Dividendes sans Retenue", condition: "Dividendes > 0 AND Retenue == 0", severity: "high", active: true },
    { id: 2, name: "IRG Salarié Incorrect", condition: "IRG != Barème_2026", severity: "high", active: true },
    { id: 3, name: "Stocks Négatifs", condition: "Stock < 0", severity: "medium", active: true },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <ShieldAlert className="text-accent h-8 w-8" /> Moteur de Règles
          </h1>
          <p className="text-muted-foreground">Alertes automatiques pour les abonnés PRO sans code.</p>
        </div>
        <Button className="bg-primary shadow-lg"><Plus className="mr-2 h-4 w-4" /> Nouvelle Règle</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="md:col-span-3 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Registre des Alertes</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filtrer..." className="pl-9 w-64 bg-background" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nom de la Règle</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-muted/20">
                    <TableCell className="font-bold text-sm">{rule.name}</TableCell>
                    <TableCell className="font-mono text-[10px] text-primary bg-primary/5 px-2 py-1 rounded">{rule.condition}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={rule.severity === 'high' ? 'border-destructive text-destructive bg-destructive/5' : 'border-amber-500 text-amber-600 bg-amber-50'}>
                        {rule.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell><Switch checked={rule.active} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"><Play className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader><CardTitle className="text-sm">Audit Temps Réel</CardTitle></CardHeader>
            <CardContent>
              <p className="text-4xl font-black">1,420</p>
              <p className="text-[10px] opacity-80 mt-1">Anomalies détectées ce mois sur le parc client.</p>
              <Button className="w-full mt-4 bg-accent text-primary font-bold hover:bg-accent/90">Audit Global</Button>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/5">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-primary">Conformité Loi 2026</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-primary"><AlertCircle className="h-4 w-4" /> Barème IRG validé</div>
              <div className="flex items-center gap-2 text-xs font-medium text-primary"><AlertCircle className="h-4 w-4" /> Minimum IBS 10k validé</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
