"use client"

import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useAuth, hasPermission } from "@/lib/auth-context"
import { formatPKR } from "@/src/lib/waqf-utils"

type DonorItem = {
  _id: string
  donorId: string
  name: string
  email?: string
  phone: string
  cnic?: string
  address?: string
  city?: string
  status: "active" | "inactive"
  monthlyAmount: number
  notes?: string
}

type PaymentItem = {
  _id: string
  paymentId: string
  donor:
    | {
        _id: string
        donorId?: string
        name?: string
      }
    | string
  amount: number
  month: number
  year: number
  method: "cash" | "bank_transfer" | "easypaisa" | "jazzcash"
  status: "paid" | "pending" | "missed"
  notes?: string
}

export default function DonorsPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user?.role, "create")
  const canEdit = hasPermission(user?.role, "edit")
  const canDelete = hasPermission(user?.role, "delete")

  const [donors, setDonors] = useState<DonorItem[]>([])
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [error, setError] = useState("")
  const [addError, setAddError] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingDonorId, setEditingDonorId] = useState<string | null>(null)
  const [deletingDonorId, setDeletingDonorId] = useState("")
  const [entryError, setEntryError] = useState("")
  const [entrySuccess, setEntrySuccess] = useState("")
  const [entrySaving, setEntrySaving] = useState(false)
  const [viewMode, setViewMode] = useState<"donations" | "donors">("donations")
  const [filterMode, setFilterMode] = useState<"month" | "range">("month")
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const today = new Date()
  const [paymentMonth, setPaymentMonth] = useState(String(today.getMonth() + 1))
  const [paymentYear, setPaymentYear] = useState(String(today.getFullYear()))
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [entryData, setEntryData] = useState({
    donorId: "",
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
    amount: "1000",
    method: "cash" as "cash" | "bank_transfer" | "easypaisa" | "jazzcash",
    receivedBy: user?.name || "Admin",
    notes: "",
    is_previous: false,
    is_advance: false,
  })

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cnic: "",
    address: "",
    city: "",
    status: "active" as "active" | "inactive",
    monthlyAmount: "1000",
    notes: "",
  })

  const loadDonors = async () => {
    const res = await fetch("/api/donors?limit=0")
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || "Failed to fetch donors")
      return
    }
    setDonors(data.donors || [])

    const donorList = data.donors || []
    if (!entryData.donorId && donorList.length > 0) {
      setEntryData((prev) => ({
        ...prev,
        donorId: donorList[0]._id,
        amount: String(donorList[0].monthlyAmount || 1000),
      }))
    }
  }

  const loadPayments = async (options?: { donorId?: string; month?: string; year?: string; fromDate?: string; toDate?: string }) => {
    setPaymentsLoading(true)
    const params = new URLSearchParams()
    if (options?.donorId) params.set("donorId", options.donorId)
    if (options?.month) params.set("month", options.month)
    if (options?.year) params.set("year", options.year)
    if (options?.fromDate) params.set("fromDate", options.fromDate)
    if (options?.toDate) params.set("toDate", options.toDate)

    const query = params.toString() ? `?${params.toString()}` : ""
    const res = await fetch(`/api/payments${query}`)
    const data = await res.json()
    if (!res.ok) {
      setEntryError(data?.error || "Failed to load payment records")
      setPaymentsLoading(false)
      return
    }
    setPayments(data.payments || [])
    setPaymentsLoading(false)
  }

  useEffect(() => {
    loadDonors()
  }, [])

  useEffect(() => {
    if (filterMode === "month") {
      loadPayments({ month: paymentMonth, year: paymentYear })
      return
    }

    if (fromDate || toDate) {
      loadPayments({ fromDate, toDate })
      return
    }

    setPayments([])
  }, [filterMode, paymentMonth, paymentYear, fromDate, toDate])

  useEffect(() => {
    if (!user?.name) return
    setEntryData((prev) => ({ ...prev, receivedBy: prev.receivedBy || user.name }))
  }, [user?.name])

  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      const matchesSearch =
        donor.name.toLowerCase().includes(search.toLowerCase()) ||
        donor.donorId.toLowerCase().includes(search.toLowerCase()) ||
        (donor.email || "").toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === "all" || donor.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [donors, search, statusFilter])

  const donationsSummary = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const paidRows = payments.filter((p) => p.status === "paid").length
    const uniqueDonors = new Set(
      payments.map((p) => (typeof p.donor === "string" ? p.donor : p.donor?._id || "")).filter(Boolean)
    ).size

    return {
      totalAmount,
      paidRows,
      uniqueDonors,
      totalDonors: donors.length,
    }
  }, [payments, donors.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError("")
    setAdding(true)
    const isEditMode = !!editingDonorId
    const endpoint = isEditMode ? `/api/donors/${editingDonorId}` : "/api/donors"
    const method = isEditMode ? "PUT" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cnic: formData.cnic,
        address: formData.address,
        city: formData.city,
        status: formData.status,
        monthlyAmount: Number(formData.monthlyAmount || 1000),
        notes: formData.notes,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setAddError(data?.error || (isEditMode ? "Failed to update donor" : "Failed to create donor"))
      setAdding(false)
      return
    }

    setIsAddOpen(false)
    setEditingDonorId(null)
    setFormData({ name: "", email: "", phone: "", cnic: "", address: "", city: "", status: "active", monthlyAmount: "1000", notes: "" })
    setAdding(false)
    setAddError("")
    setError("")
    await loadDonors()
  }

  const handleEditClick = (donor: DonorItem) => {
    setEditingDonorId(donor._id)
    setAddError("")
    setFormData({
      name: donor.name,
      email: donor.email || "",
      phone: donor.phone,
      cnic: donor.cnic || "",
      address: donor.address || "",
      city: donor.city || "",
      status: donor.status || "active",
      monthlyAmount: String(donor.monthlyAmount || 1000),
      notes: donor.notes || "",
    })
    setIsAddOpen(true)
  }

  const handleDelete = async (donor: DonorItem) => {
    const ok = window.confirm(`Delete donor ${donor.name}? This marks donor as inactive.`)
    if (!ok) return

    setDeletingDonorId(donor._id)
    setError("")

    const res = await fetch(`/api/donors/${donor._id}`, {
      method: "DELETE",
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data?.error || "Failed to delete donor")
      setDeletingDonorId("")
      return
    }

    setDeletingDonorId("")
    await loadDonors()
  }

  const handleEntrySubmit = async () => {
    if (entrySaving) return

    setEntryError("")
    setEntrySuccess("")
    setEntrySaving(true)

    if (!entryData.donorId) {
      setEntryError("Please select a donor first")
      setEntrySaving(false)
      return
    }

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorId: entryData.donorId,
        amount: Number(entryData.amount || 0),
        month: Number(entryData.month || 0),
        year: Number(entryData.year || 0),
        method: entryData.method,
        receivedBy: entryData.receivedBy || user?.name || "Admin",
        notes: entryData.notes,
        is_previous: entryData.is_previous,
        is_advance: entryData.is_advance,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setEntryError(data?.error || "Failed to save payment row")
      setEntrySaving(false)
      return
    }

    const createdCount = Number(data?.createdCount || 1)
    if (createdCount > 1) {
      setEntrySuccess(`${createdCount} payment rows saved with split logic`)
      window.alert(`${createdCount} payment rows saved successfully.`)
    } else {
      setEntrySuccess("Payment row saved")
      window.alert("Payment saved successfully.")
    }
    setEntryData((prev) => ({ ...prev, notes: "" }))
    if (filterMode === "month") {
      await loadPayments({ month: paymentMonth, year: paymentYear })
    } else if (fromDate || toDate) {
      await loadPayments({ fromDate, toDate })
    }
    setEntrySaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Donors</h1>
          <p className="text-muted-foreground">Manage database-backed donor records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="w-full sm:w-auto"
            variant={viewMode === "donations" ? "default" : "outline"}
            onClick={() => setViewMode("donations")}
          >
            Donations View
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            variant={viewMode === "donors" ? "default" : "outline"}
            onClick={() => setViewMode("donors")}
          >
            Donor List
          </Button>
          {canCreate && (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingDonorId(null)
                setAddError("")
                setFormData({ name: "", email: "", phone: "", cnic: "", address: "", city: "", status: "active", monthlyAmount: "1000", notes: "" })
                setIsAddOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Donor
            </Button>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="flex-1">
              <Input placeholder="Search by name, ID, or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMode} onValueChange={(value: "month" | "range") => setFilterMode(value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Donation Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Current/Selected Month</SelectItem>
                <SelectItem value="range">Date Range</SelectItem>
              </SelectContent>
            </Select>
            {filterMode === "month" ? (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  placeholder="Month"
                />
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={paymentYear}
                  onChange={(e) => setPaymentYear(e.target.value)}
                  placeholder="Year"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Donors Summary</CardTitle>
          <CardDescription>
            {filterMode === "month"
              ? `Donation totals for ${paymentMonth}/${paymentYear}`
              : "Donation totals for selected date range"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Donors</p>
              <p className="text-xl font-semibold">{donationsSummary.totalDonors}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Donors Donated</p>
              <p className="text-xl font-semibold">{donationsSummary.uniqueDonors}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid Rows</p>
              <p className="text-xl font-semibold">{donationsSummary.paidRows}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Donation</p>
              <p className="text-xl font-semibold text-primary">{formatPKR(donationsSummary.totalAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Donors Donations</CardTitle>
          <CardDescription>
            {filterMode === "month"
              ? `Showing all donor donations for ${paymentMonth}/${paymentYear}`
              : "Showing all donor donations in selected date range"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-3 md:hidden">
            {paymentsLoading ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading donations...</div>
            ) : payments.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">No donations found for current filter.</div>
            ) : (
              payments.map((payment) => {
                const donorName = typeof payment.donor === "string"
                  ? payment.donor
                  : `${payment.donor?.donorId || ""} ${payment.donor?.name || ""}`.trim() || "-"
                return (
                  <div key={payment._id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{payment.paymentId}</p>
                      <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{donorName}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>Period: {payment.month}/{payment.year}</p>
                      <p>Method: {payment.method}</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-primary">{formatPKR(payment.amount)}</p>
                  </div>
                )
              })
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">Loading donations...</TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">No donations found for current filter.</TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => {
                    const donorName = typeof payment.donor === "string"
                      ? payment.donor
                      : `${payment.donor?.donorId || ""} ${payment.donor?.name || ""}`.trim() || "-"
                    return (
                      <TableRow key={payment._id}>
                        <TableCell className="font-medium">{payment.paymentId}</TableCell>
                        <TableCell>{donorName}</TableCell>
                        <TableCell>{payment.month}/{payment.year}</TableCell>
                        <TableCell>{formatPKR(payment.amount)}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {viewMode === "donors" ? (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Donor List</CardTitle>
          <CardDescription>{filteredDonors.length} {filteredDonors.length === 1 ? "donor" : "donors"} found</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-3 md:hidden">
            {filteredDonors.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">No donors found.</div>
            ) : (
              filteredDonors.map((donor) => (
                <div key={donor._id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/dashboard/donors/${donor._id}`} className="text-sm font-semibold text-primary hover:underline">
                        {donor.donorId}
                      </Link>
                      <p className="text-sm font-medium">{donor.name}</p>
                    </div>
                    <Badge variant={donor.status === "active" ? "default" : "secondary"}>{donor.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{donor.phone} • {donor.email || "-"}</p>
                  <p className="text-xs text-muted-foreground">{donor.city || "-"}</p>
                  <p className="mt-2 text-sm font-semibold">{formatPKR(donor.monthlyAmount)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEntryData((prev) => ({
                          ...prev,
                          donorId: donor._id,
                          amount: String(donor.monthlyAmount || prev.amount),
                        }))
                        setEntrySuccess(`Entry form ready for ${donor.name}`)
                        setEntryError("")
                      }}
                    >
                      Record Payment
                    </Button>
                    {canEdit ? (
                      <Button size="sm" variant="outline" onClick={() => handleEditClick(donor)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingDonorId === donor._id}
                        onClick={() => handleDelete(donor)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {deletingDonorId === donor._id ? "Deleting..." : "Delete"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Monthly Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonors.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No donors found.</TableCell></TableRow>
                ) : (
                  filteredDonors.map((donor) => (
                    <TableRow key={donor._id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/donors/${donor._id}`} className="hover:underline text-primary">
                          {donor.donorId}
                        </Link>
                      </TableCell>
                      <TableCell><p className="font-medium">{donor.name}</p></TableCell>
                      <TableCell>
                        <p className="text-sm">{donor.phone}</p>
                        <p className="text-sm text-muted-foreground">{donor.email || "-"}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{donor.city || "-"}</TableCell>
                      <TableCell className="font-medium">{formatPKR(donor.monthlyAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={donor.status === "active" ? "default" : "secondary"}>{donor.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEntryData((prev) => ({
                                ...prev,
                                donorId: donor._id,
                                amount: String(donor.monthlyAmount || prev.amount),
                              }))
                              setEntrySuccess(`Entry form ready for ${donor.name}`)
                              setEntryError("")
                            }}
                          >
                            Record Payment
                          </Button>
                          {canEdit ? (
                            <Button size="sm" variant="outline" onClick={() => handleEditClick(donor)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deletingDonorId === donor._id}
                              onClick={() => handleDelete(donor)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {deletingDonorId === donor._id ? "Deleting..." : "Delete"}
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
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Entry Form</CardTitle>
          <CardDescription>
            Record payment as normal or split it across months using is_previous / is_advance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entryError ? <p className="text-sm text-destructive">{entryError}</p> : null}
          {entrySuccess ? <p className="text-sm text-primary">{entrySuccess}</p> : null}

          <div className="rounded-md border p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <FieldLabel>Donor</FieldLabel>
                <Select
                  value={entryData.donorId}
                  onValueChange={(value) => {
                    const donor = donors.find((d) => d._id === value)
                    setEntryData((prev) => ({
                      ...prev,
                      donorId: value,
                      amount: String(donor?.monthlyAmount || prev.amount),
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor" />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map((donor) => (
                      <SelectItem key={donor._id} value={donor._id}>
                        {donor.donorId} - {donor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel>Month</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={entryData.month}
                  onChange={(e) => setEntryData((prev) => ({ ...prev, month: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Year</FieldLabel>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={entryData.year}
                  onChange={(e) => setEntryData((prev) => ({ ...prev, year: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Amount</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={entryData.amount}
                  onChange={(e) => setEntryData((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Method</FieldLabel>
                <Select
                  value={entryData.method}
                  onValueChange={(value: "cash" | "bank_transfer" | "easypaisa" | "jazzcash") =>
                    setEntryData((prev) => ({ ...prev, method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel>Received By</FieldLabel>
                <Input
                  value={entryData.receivedBy}
                  onChange={(e) => setEntryData((prev) => ({ ...prev, receivedBy: e.target.value }))}
                />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <FieldLabel>Notes</FieldLabel>
                <Input
                  value={entryData.notes}
                  onChange={(e) => setEntryData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-5">
                <Label className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={entryData.is_previous}
                    onCheckedChange={(checked) =>
                      setEntryData((prev) => ({
                        ...prev,
                        is_previous: Boolean(checked),
                        is_advance: Boolean(checked) ? false : prev.is_advance,
                      }))
                    }
                  />
                  is_previous
                </Label>
                <Label className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={entryData.is_advance}
                    onCheckedChange={(checked) =>
                      setEntryData((prev) => ({
                        ...prev,
                        is_advance: Boolean(checked),
                        is_previous: Boolean(checked) ? false : prev.is_previous,
                      }))
                    }
                  />
                  is_advance
                </Label>
              </div>
              <Button onClick={handleEntrySubmit} disabled={entrySaving}>
                {entrySaving ? "Saving..." : "Save Payment"}
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Split logic: if amount is multiple of donor monthly amount, is_previous splits backward to selected month,
              and is_advance splits forward from selected month.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            This sheet records payments for selected donor, while the donations table above shows all donors by current filter.
          </p>
        </CardContent>
      </Card>

      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingDonorId ? "Edit Donor" : "Add New Donor"}</SheetTitle>
            <SheetDescription>{editingDonorId ? "Update donor details." : "Register a new donor in the database."}</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6">
            <FieldGroup>
              {addError ? <p className="text-sm text-destructive">{addError}</p> : null}
              <Field><FieldLabel htmlFor="name">Full Name</FieldLabel><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></Field>
              <Field><FieldLabel htmlFor="phone">Phone Number</FieldLabel><Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="cnic">CNIC</FieldLabel><Input id="cnic" value={formData.cnic} onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} placeholder="12345-1234567-1" /></Field>
              <Field><FieldLabel htmlFor="address">Address</FieldLabel><Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></Field>
              <Field><FieldLabel htmlFor="city">City</FieldLabel><Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></Field>
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select value={formData.status} onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field><FieldLabel htmlFor="allocation">Monthly Amount (PKR)</FieldLabel><Input id="allocation" type="number" value={formData.monthlyAmount} onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="notes">Notes</FieldLabel><Input id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></Field>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={adding}>
                  {adding ? (editingDonorId ? "Updating..." : "Adding...") : (editingDonorId ? "Update Donor" : "Add Donor")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false)
                    setEditingDonorId(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}