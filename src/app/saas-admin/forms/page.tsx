
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileEdit, Settings2, Eye, Save, 
  History, FileCheck, Search, Layout
} from "lucide-react"
import { Input } from "@/components/ui/input"

export default function DgiFormsEditor() {
  const templates = [
    { id: 'g50', name: "G N° 50 - Mensuelle", lastUpdate: "2026-01-15", version: "V2.4", status: "Active" },
    { id: 'ibs', name: "G N° 4 - IBS Annuel", lastUpdate: "2026-02-01", version: "V3.1", status: "Beta" },
    { id: 'g50a', name: "G N° 50A - Trimestrielle", lastUpdate: "2025-12-20", version: "V1.8", status: "Active" },
    { id: 'g12', name: "G N° 12 - IFU Annuel", lastUpdate: "2026-01-10", version: "V2.0", status: "Active" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layout className="text-accent h-8 w-8" /> Templates DGI
          </h1>
          <p className="text-muted-foreground">Mise à jour structurelle des formulaires officiels (LF 2026).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><History className="mr-2 h-4 w-4" /> Historique</Button>
          <Button className="bg-primary shadow-lg"><Save className="mr-2 h-4 w-4" /> Publier Globalement</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Librairie des Modèles</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-9 w-64 bg-background" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border hover:border-primary transition-all group bg-card shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                        <FileEdit className="h-6 w-6 text-primary group-hover:text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold">{t.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">V {t.version} • Mis à jour le {t.lastUpdate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-primary"><Settings2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader><CardTitle className="text-sm font-bold">État des Déclarations 2026</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold"><span>IBS Opérationnel</span><Badge className="bg-white text-primary">100%</Badge></div>
                <div className="flex justify-between text-xs font-bold"><span>G50 Dynamique</span><Badge className="bg-white text-primary">100%</Badge></div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-xl bg-accent/10 border border-accent/20 flex items-start gap-4">
            <FileCheck className="h-6 w-6 text-accent shrink-0 mt-1" />
            <div className="text-xs text-primary leading-relaxed">
              <p className="font-bold mb-1">Validation XML Damancom</p>
              Le moteur vérifie chaque structure de fichier avant la mise à jour des abonnés. Dernière certification : Janvier 2026.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
