"use client"

import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

type ExpenditureItem = {
  _id: string
  expenditureId: string
  title: string
  category: "operations" | "charity" | "maintenance" | "salaries" | "events" | "other"
  mode: "pay" | "received"
  amount: number
  date: string
  description?: string
  approvedBy?: string
  receiptNumber?: string
}

const categoryOptions: Array<ExpenditureItem["category"]> = [
  "salaries",
  "operations",
  "maintenance",
  "charity",
  "events",
  "other",
]

export default function ExpendituresPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user?.role, "create")
  const canEdit = hasPermission(user?.role, "edit")
  const canDelete = hasPermission(user?.role, "delete")

  const [items, setItems] = useState<ExpenditureItem[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState("")
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const now = new Date()
  const [formData, setFormData] = useState({
    title: "",
    category: "salaries" as ExpenditureItem["category"],
    mode: "pay" as ExpenditureItem["mode"],
    amount: "",
    date: now.toISOString().slice(0, 10),
    description: "",
    approvedBy: user?.name || "Admin",
    receiptNumber: "",
  })

  const loadExpenditures = async () => {
    const params = new URLSearchParams()
    if (categoryFilter !== "all") params.set("category", categoryFilter)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)

    const query = params.toString() ? `?${params.toString()}` : ""
    const res = await fetch(`/api/expenditures${query}`)
    const data = await res.json()

    if (!res.ok) {
      setError(data?.error || "Failed to load expenditures")
      return
    }

    setItems(data.expenditures || [])
    setError("")
  }

  useEffect(() => {
    loadExpenditures()
  }, [categoryFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!user?.name) return
    setFormData((prev) => ({ ...prev, approvedBy: prev.approvedBy || user.name }))
  }, [user?.name])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.expenditureId.toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q)
    )
  }, [items, search])

  const totalAmount = useMemo(
    () =>
      filteredItems.reduce(
        (sum, item) => sum + (item.mode === "received" ? Number(item.amount || 0) : -Number(item.amount || 0)),
        0
      ),
    [filteredItems]
  )

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      title: "",
      category: "salaries",
      mode: "pay",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      description: "",
      approvedBy: user?.name || "Admin",
      receiptNumber: "",
    })
  }

  const openAdd = () => {
    resetForm()
    setIsSheetOpen(true)
  }

  const openEdit = (item: ExpenditureItem) => {
    setEditingId(item._id)
    setFormData({
      title: item.title,
      category: item.category,
      mode: item.mode || "pay",
      amount: String(item.amount),
      date: new Date(item.date).toISOString().slice(0, 10),
      description: item.description || "",
      approvedBy: item.approvedBy || user?.name || "Admin",
      receiptNumber: item.receiptNumber || "",
    })
    setIsSheetOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    const isEdit = !!editingId
    const endpoint = isEdit ? `/api/expenditures/${editingId}` : "/api/expenditures"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.title,
        category: formData.category,
        mode: formData.mode,
        amount: Number(formData.amount || 0),
        date: formData.date,
        description: formData.description,
        approvedBy: formData.approvedBy,
        receiptNumber: formData.receiptNumber,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || (isEdit ? "Failed to update expenditure" : "Failed to add expenditure"))
      setSaving(false)
      return
    }

    setSaving(false)
    setIsSheetOpen(false)
    resetForm()
    await loadExpenditures()
  }

  const handleDelete = async (item: ExpenditureItem) => {
    const ok = window.confirm(`Delete expenditure ${item.expenditureId}?`)
    if (!ok) return

    setDeletingId(item._id)
    setError("")

    const res = await fetch(`/api/expenditures/${item._id}`, { method: "DELETE" })
    const data = await res.json()

    if (!res.ok) {
      setError(data?.error || "Failed to delete expenditure")
      setDeletingId("")
      return
    }

    setDeletingId("")
    await loadExpenditures()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Expenditures</h1>
          <p className="text-muted-foreground">Track donation spending, including Qari/Imam salary and mosque expenses.</p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expenditure
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input
              placeholder="Search by ID, title, description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Expense Register</CardTitle>
          <CardDescription>
            {filteredItems.length} {filteredItems.length === 1 ? "record" : "records"} • Net impact: {formatPKR(totalAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">No expenditures found.</TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.expenditureId}</TableCell>
                      <TableCell>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description || "-"}</p>
                      </TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell>
                        <Badge variant={item.mode === "received" ? "secondary" : "outline"} className="capitalize">
                          {item.mode}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                      <TableCell>{item.approvedBy || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatPKR(item.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          {canEdit ? (
                            <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item._id}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {deletingId === item._id ? "Deleting..." : "Delete"}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Expenditure" : "Add Expenditure"}</SheetTitle>
            <SheetDescription>
              {editingId ? "Update expense details." : "Add a new expense such as salary for Qari/Imam."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Select
                  value={formData.category}
                  onValueChange={(value: ExpenditureItem["category"]) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="mode">Mode</FieldLabel>
                <Select
                  value={formData.mode}
                  onValueChange={(value: ExpenditureItem["mode"]) => setFormData({ ...formData, mode: value })}
                >
                  <SelectTrigger id="mode"><SelectValue placeholder="Mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pay">Pay</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="amount">Amount (PKR)</FieldLabel>
                <Input id="amount" type="number" min={1} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="date">Date</FieldLabel>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="approvedBy">Approved By</FieldLabel>
                <Input id="approvedBy" value={formData.approvedBy} onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="receiptNumber">Receipt Number</FieldLabel>
                <Input id="receiptNumber" value={formData.receiptNumber} onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </Field>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? (editingId ? "Updating..." : "Saving...") : (editingId ? "Update Expenditure" : "Save Expenditure")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              </div>
            </FieldGroup>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
