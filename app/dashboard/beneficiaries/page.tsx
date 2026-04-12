"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useAuth, hasPermission } from "@/lib/auth-context"
import { formatPKR } from "@/src/lib/waqf-utils"

type DonorItem = {
  _id: string
  donorId: string
  name: string
  email?: string
  phone: string
  city?: string
  status: "active" | "inactive"
  monthlyAmount: number
}

export default function BeneficiariesPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user?.role, "create")

  const [donors, setDonors] = useState<DonorItem[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    monthlyAmount: "1000",
    notes: "",
  })

  const loadDonors = async () => {
    const res = await fetch("/api/donors?limit=500")
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || "Failed to fetch beneficiaries")
      return
    }
    setDonors(data.donors || [])
  }

  useEffect(() => {
    loadDonors()
  }, [])

  const filteredBeneficiaries = useMemo(() => {
    return donors.filter((donor) => {
      const matchesSearch =
        donor.name.toLowerCase().includes(search.toLowerCase()) ||
        donor.donorId.toLowerCase().includes(search.toLowerCase()) ||
        (donor.email || "").toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === "all" || donor.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [donors, search, statusFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/donors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        monthlyAmount: Number(formData.monthlyAmount || 1000),
        notes: formData.notes,
        status: "active",
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || "Failed to create beneficiary")
      return
    }

    setIsAddOpen(false)
    setFormData({ name: "", email: "", phone: "", address: "", city: "", monthlyAmount: "1000", notes: "" })
    setError("")
    await loadDonors()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Beneficiaries</h1>
          <p className="text-muted-foreground">Manage database-backed beneficiary records.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Beneficiary
          </Button>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Search by name, ID, or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Beneficiary List</CardTitle>
          <CardDescription>{filteredBeneficiaries.length} {filteredBeneficiaries.length === 1 ? "beneficiary" : "beneficiaries"} found</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Monthly Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBeneficiaries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No beneficiaries found.</TableCell></TableRow>
                ) : (
                  filteredBeneficiaries.map((beneficiary) => (
                    <TableRow key={beneficiary._id}>
                      <TableCell className="font-medium">{beneficiary.donorId}</TableCell>
                      <TableCell><p className="font-medium">{beneficiary.name}</p></TableCell>
                      <TableCell>
                        <p className="text-sm">{beneficiary.phone}</p>
                        <p className="text-sm text-muted-foreground">{beneficiary.email || "-"}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{beneficiary.city || "-"}</TableCell>
                      <TableCell className="font-medium">{formatPKR(beneficiary.monthlyAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={beneficiary.status === "active" ? "default" : "secondary"}>{beneficiary.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Beneficiary</SheetTitle>
            <SheetDescription>Register a new beneficiary in the database.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup>
              <Field><FieldLabel htmlFor="name">Full Name</FieldLabel><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></Field>
              <Field><FieldLabel htmlFor="phone">Phone Number</FieldLabel><Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="address">Address</FieldLabel><Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></Field>
              <Field><FieldLabel htmlFor="city">City</FieldLabel><Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></Field>
              <Field><FieldLabel htmlFor="allocation">Monthly Amount (PKR)</FieldLabel><Input id="allocation" type="number" value={formData.monthlyAmount} onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="notes">Notes</FieldLabel><Input id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></Field>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">Add Beneficiary</Button>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              </div>
            </FieldGroup>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

