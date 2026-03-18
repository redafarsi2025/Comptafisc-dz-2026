
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileEdit, Settings2, Download, Eye, Save, 
  History, Clock, FileCheck, Search, Layout
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
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Layout className="text-primary h-8 w-8" /> Éditeur de Templates DGI
          </h1>
          <p className="text-slate-400">Mise à jour visuelle et structurelle des formulaires officiels.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-800 hover:bg-slate-800 text-slate-300">
            <History className="mr-2 h-4 w-4" /> Historique Versions
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Save className="mr-2 h-4 w-4" /> Publier Globalement
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-slate-950 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle>Librairie des Modèles</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Rechercher un formulaire..." className="bg-slate-900 border-slate-800 pl-9 w-64 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-primary/50 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FileEdit className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100">{t.name}</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-mono">ID: {t.id} • Mis à jour le {t.lastUpdate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400 font-mono text-[10px]">
                        {t.version}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10"><Settings2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold">État des Déclarations réelles (2026)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">IBS Opérationnel</span>
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">100%</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">TAP (Suppression LF2024)</span>
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">Actif (0%)</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">G50 Dynamique</span>
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">100%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-white" />
              </div>
              <h4 className="font-bold text-sm">Validation XML Damancom</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Le moteur de validation vérifie chaque structure de fichier avant la mise à jour des abonnés PRO. 
              Dernière certification CNAS : Janvier 2026.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
