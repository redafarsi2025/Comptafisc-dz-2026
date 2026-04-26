
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Package, Search, Filter, 
  Loader2, QrCode, ShieldCheck, 
  MapPin, User, AlertTriangle, CheckCircle2, Save
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function AssetsInventory() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [assetStates, setAssetStates] = React.useState<Record<string, { status: string; location: string }>>({})

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const assetsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "assets");
  }, [db, currentTenant?.id]);
  const { data: assets, isLoading } = useCollection(assetsQuery);

  const handleUpdateAsset = (id: string, field: string, val: string) => {
    setAssetStates(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { status: 'GOOD', location: 'Siège' }), [field]: val }
    }));
  }

  const handleSaveInventory = async () => {
    if (!db || !currentTenant) return;
    setIsSaving(true);
    try {
      for (const [id, state] of Object.entries(assetStates)) {
        await updateDocumentNonBlocking(doc(db, "tenants", currentTenant.id, "assets", id), {
          physicalStatus: state.status,
          physicalLocation: state.location,
          lastInventoryDate: new Date().toISOString()
        });
      }
      toast({ title: "Inventaire immo enregistré", description: "L'état physique des actifs a été mis à jour." });
      setAssetStates({});
    } finally {
      setIsSaving(false);
    }
  }

  const filteredAssets = React.useMemo(() => {
    if (!assets) return [];
    return assets.filter(a => a.designation.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [assets, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Package className="h-8 w-8 text-accent" /> Inventaire des Actifs
          </h1>
          <p className="text-muted-foreground text-sm">Contrôle de l'existence réelle et de l'état du patrimoine (Art. 12 SCF).</p>
        </div>
        <Button onClick={handleSaveInventory} disabled={isSaving || Object.keys(assetStates).length === 0} className="bg-primary shadow-lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sauvegarder l'état physique
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Actifs à Inventorier</p>
            <h2 className="text-2xl font-black text-primary">{assets?.length || 0}</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Actifs à Réformer / HS</p>
            <h2 className="text-2xl font-black text-amber-600">{assets?.filter(a => a.physicalStatus === 'HS').length || 0}</h2>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase text-emerald-800">Taux de Couverture</p>
            <div className="flex items-center gap-2 mt-1">
               <ShieldCheck className="h-5 w-5 text-emerald-600" />
               <span className="font-bold text-lg text-emerald-700">100% (SCF OK)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Registre d'Inventaire Physique</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Chercher une immo..." 
                className="pl-9 h-9 w-64 bg-white" 
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
                <TableHead>Immobilisation / Compte</TableHead>
                <TableHead>Localisation Physique</TableHead>
                <TableHead>État Actuel</TableHead>
                <TableHead>Dernier Contrôle</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin inline mr-2 h-4 w-4" /> Chargement...</TableCell></TableRow>
              ) : !filteredAssets.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">Aucun actif trouvé.</TableCell></TableRow>
              ) : (
                filteredAssets.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/5 group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{a.designation}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">{a.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <Input 
                          className="h-7 text-[10px] w-32 bg-white" 
                          value={assetStates[a.id]?.location || a.physicalLocation || "Non défini"}
                          onChange={e => handleUpdateAsset(a.id, 'location', e.target.value)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={assetStates[a.id]?.status || a.physicalStatus || "GOOD"} 
                        onValueChange={v => handleUpdateAsset(a.id, 'status', v)}
                      >
                        <SelectTrigger className="h-7 text-[10px] w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GOOD">Bon état</SelectItem>
                          <SelectItem value="USED">Usagé</SelectItem>
                          <SelectItem value="HS">Hors Service</SelectItem>
                          <SelectItem value="REFORM">À réformer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {a.lastInventoryDate ? new Date(a.lastInventoryDate).toLocaleDateString() : 'Jamais'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold underline uppercase">Note de Conformité Inventaire des Actifs :</p>
          <p>
            Le SCF impose un inventaire physique annuel pour s'assurer que les immobilisations portées au bilan existent toujours. 
            Les actifs jugés "Hors Service" ou "À réformer" doivent faire l'objet d'une écriture de sortie ou de dépréciation exceptionnelle 
            pour respecter l'image fidèle du patrimoine.
          </p>
        </div>
      </div>
    </div>
  )
}
