
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Users, Calculator, Wallet } from "lucide-react"
import { PAYROLL_CONSTANTS } from "@/lib/calculations"

export default function PayrollPage() {
  const [employees, setEmployees] = React.useState([
    { name: "Ahmed Benali", baseSalary: 45000, prime: 5000 },
    { name: "Fatima Zahra", baseSalary: 38000, prime: 2000 },
  ])

  const calculateNet = (base: number, prime: number) => {
    const gross = base + prime;
    const cnas = gross * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
    return gross - cnas; // Simplified for MVP
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestion de la Paie</h1>
          <p className="text-muted-foreground">Calcul des salaires, CNAS et IRG selon le barème algérien.</p>
        </div>
        <Button className="bg-primary">
          <Plus className="mr-2 h-4 w-4" /> Nouvel Employé
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Liste du personnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Salaire Base</TableHead>
                  <TableHead className="text-right">Net à payer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.baseSalary.toLocaleString()} DZD</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {calculateNet(e.baseSalary, e.prime).toLocaleString()} DZD
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-accent" /> Cotisations Sociales (CNAS)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Part Ouvrière (9%)</span>
                <span>{(employees.reduce((acc, e) => acc + (e.baseSalary + e.prime), 0) * 0.09).toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Part Patronale (26%)</span>
                <span>{(employees.reduce((acc, e) => acc + (e.baseSalary + e.prime), 0) * 0.26).toLocaleString()} DZD</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-primary">
                <span>Total CNAS à reverser</span>
                <span>{(employees.reduce((acc, e) => acc + (e.baseSalary + e.prime), 0) * 0.35).toLocaleString()} DZD</span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Wallet className="mr-2 h-4 w-4" /> Préparer le paiement
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
