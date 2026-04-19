"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPKR, MONTH_NAMES } from "@/src/lib/waqf-utils"
import { hasPermission, useAuth } from "@/lib/auth-context"

type LedgerRow = {
  month: number
  monthName: string
  status: "paid" | "pending" | "missed"
  amount: number
  expectedAmount: number
  paidAmount: number
  openingBalance: number
  closingBalance: number
  paymentRecordId: string | null
  method: "cash" | "bank_transfer" | "easypaisa" | "jazzcash" | null
  notes: string | null
  receivedBy: string | null
  paymentDate: string | null
  paymentId: string | null
}

type DonorDetails = {
  _id: string
  donorId: string
  name: string
  phone: string
  email?: string
  city?: string
  monthlyAmount: number
  status: "active" | "inactive"
}

type ApiResponse = {
  donor: DonorDetails
  year: number
  ledger: LedgerRow[]
  summary: {
    openingBalance: number
    closingBalance: number
    totalReceived: number
    totalPending: number
  }
}

export default function DonorLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const canEdit = hasPermission(user?.role, "edit")
  const canDelete = hasPermission(user?.role, "delete")

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [saving, setSaving] = useState(false)
  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)

  const [entry, setEntry] = useState({
    month: String(new Date().getMonth() + 1),
    amount: "1000",
    method: "cash" as "cash" | "bank_transfer" | "easypaisa" | "jazzcash",
    receivedBy: user?.name || "Admin",
    notes: "",
  })

  const loadLedger = async (targetYear: string) => {
    setLoading(true)
    setError("")
    const res = await fetch(`/api/donors/${id}?year=${targetYear}`)
    const result = await res.json()

    if (!res.ok) {
      setError(result?.error || "Failed to load donor ledger")
      setData(null)
      setLoading(false)
      return
    }

    setData(result)
    setEntry((prev) => ({
      ...prev,
      amount: String(result?.donor?.monthlyAmount || prev.amount),
    }))
    setLoading(false)
  }

  useEffect(() => {
    loadLedger(year)
  }, [id, year])

  useEffect(() => {
    if (!user?.name) return
    setEntry((prev) => ({ ...prev, receivedBy: prev.receivedBy || user.name }))
  }, [user?.name])

  const yearOptions = useMemo(() => {
    const y = currentYear
    return [y - 1, y, y + 1].map((v) => String(v))
  }, [currentYear])

  const handleSavePayment = async () => {
    if (!data?.donor?._id) return

    setSaveError("")
    setSaveSuccess("")
    setSaving(true)

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorId: data.donor._id,
        month: Number(entry.month),
        year: Number(year),
        amount: Number(entry.amount || data.donor.monthlyAmount || 0),
        method: entry.method,
        receivedBy: entry.receivedBy || user?.name || "Admin",
        notes: entry.notes,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setSaveError(result?.error || "Failed to save payment")
      setSaving(false)
      return
    }

    setSaveSuccess(`Payment saved for ${MONTH_NAMES[Number(entry.month) - 1]} ${year}`)
    setEntry((prev) => ({ ...prev, notes: "" }))
    setSaving(false)
    await loadLedger(year)
  }

  const handleEditRow = async (row: LedgerRow) => {
    if (!row.paymentRecordId) return

    const currentAmount = row.paidAmount || row.amount || 0
    const nextAmountInput = window.prompt("Enter updated paid amount", String(currentAmount))
    if (nextAmountInput === null) return

    const nextAmount = Number(nextAmountInput)
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setSaveError("Amount must be greater than 0")
      return
    }

    setSaveError("")
    setSaveSuccess("")
    setRowActionId(row.paymentRecordId)

    const res = await fetch(`/api/payments/${row.paymentRecordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: nextAmount,
        month: row.month,
        year: Number(year),
        method: row.method || "cash",
        paymentDate: row.paymentDate || new Date().toISOString(),
        receivedBy: row.receivedBy || user?.name || "Admin",
        notes: row.notes || "",
        status: "paid",
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setSaveError(result?.error || "Failed to update payment")
      setRowActionId(null)
      return
    }

    setSaveSuccess(`Payment updated for ${row.monthName} ${year}`)
    setRowActionId(null)
    await loadLedger(year)
  }

  const handleDeleteRow = async (row: LedgerRow) => {
    if (!row.paymentRecordId) return
    const ok = window.confirm(`Delete payment for ${row.monthName} ${year}?`)
    if (!ok) return

    setSaveError("")
    setSaveSuccess("")
    setRowActionId(row.paymentRecordId)

    const res = await fetch(`/api/payments/${row.paymentRecordId}`, {
      method: "DELETE",
    })

    const result = await res.json()
    if (!res.ok) {
      setSaveError(result?.error || "Failed to delete payment")
      setRowActionId(null)
      return
    }

    setSaveSuccess(`Payment deleted for ${row.monthName} ${year}`)
    setRowActionId(null)
    await loadLedger(year)
  }

  const renderRowActions = (row: LedgerRow) => {
    if (!row.paymentRecordId) {
      return <span className="text-muted-foreground">-</span>
    }

    return (
      <div className="inline-flex gap-2">
        {canEdit ? (
          <Button
            size="sm"
            variant="outline"
            disabled={rowActionId === row.paymentRecordId}
            onClick={() => handleEditRow(row)}
          >
            {rowActionId === row.paymentRecordId ? "Working..." : "Edit"}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={rowActionId === row.paymentRecordId}
            onClick={() => handleDeleteRow(row)}
          >
            {rowActionId === row.paymentRecordId ? "Working..." : "Delete"}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/donors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Donors
        </Link>
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Donor Ledger</CardTitle>
          <CardDescription>
            {data?.donor ? `${data.donor.name} (${data.donor.donorId})` : "Loading donor..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{data?.donor?.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">City</p>
              <p className="font-medium">{data?.donor?.city || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Amount</p>
              <p className="font-medium">{formatPKR(data?.donor?.monthlyAmount || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={data?.donor?.status === "active" ? "default" : "secondary"}>
                {data?.donor?.status || "-"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yearly Ledger Sheet</CardTitle>
          <CardDescription>Month-wise payment status and entries for selected donor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="w-full">
              <p className="mb-2 text-sm">Year</p>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <p className="mb-2 text-sm">Month</p>
              <Select value={entry.month} onValueChange={(value) => setEntry((prev) => ({ ...prev, month: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, index) => (
                    <SelectItem key={name} value={String(index + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <p className="mb-2 text-sm">Amount</p>
              <Input
                type="number"
                min={1}
                value={entry.amount}
                onChange={(e) => setEntry((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="w-full">
              <p className="mb-2 text-sm">Method</p>
              <Select
                value={entry.method}
                onValueChange={(value: "cash" | "bank_transfer" | "easypaisa" | "jazzcash") =>
                  setEntry((prev) => ({ ...prev, method: value }))
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
            <div className="w-full lg:self-end">
              <Button type="button" className="w-full" onClick={handleSavePayment} disabled={saving || loading}>
                {saving ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </div>

          {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
          {saveSuccess ? <p className="text-sm text-primary">{saveSuccess}</p> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Opening Balance ({year})</p>
                <p className="text-xl font-semibold">{formatPKR(data?.summary?.openingBalance || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Received ({year})</p>
                <p className="text-xl font-semibold text-primary">{formatPKR(data?.summary?.totalReceived || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Pending ({year})</p>
                <p className="text-xl font-semibold text-destructive">{formatPKR(data?.summary?.totalPending || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Closing Balance ({year})</p>
                <p className="text-xl font-semibold">{formatPKR(data?.summary?.closingBalance || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3 md:hidden">
            {loading ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">Loading ledger...</CardContent>
              </Card>
            ) : (data?.ledger || []).length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">No ledger data found.</CardContent>
              </Card>
            ) : (
              (data?.ledger || []).map((row) => (
                <Card key={row.month}>
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{row.monthName} {year}</p>
                      <Badge variant={row.status === "paid" ? "default" : "secondary"}>{row.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Expected / Paid</p>
                        <p>{formatPKR(row.expectedAmount)} / {formatPKR(row.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Date</p>
                        <p>{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Opening Balance</p>
                        <p>{formatPKR(row.openingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Closing Balance</p>
                        <p>{formatPKR(row.closingBalance)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment ID</p>
                      <p className="break-all text-sm">{row.paymentId || "-"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">{renderRowActions(row)}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected / Paid Amount</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Closing Balance</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-16 text-center text-muted-foreground">Loading ledger...</TableCell>
                  </TableRow>
                ) : (data?.ledger || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-16 text-center text-muted-foreground">No ledger data found.</TableCell>
                  </TableRow>
                ) : (
                  (data?.ledger || []).map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.monthName} {year}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "paid" ? "default" : "secondary"}>{row.status}</Badge>
                      </TableCell>
                      <TableCell>{formatPKR(row.expectedAmount)} / {formatPKR(row.paidAmount)}</TableCell>
                      <TableCell>{formatPKR(row.openingBalance)}</TableCell>
                      <TableCell>{formatPKR(row.closingBalance)}</TableCell>
                      <TableCell>{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{row.paymentId || "-"}</TableCell>
                      <TableCell className="text-right">{renderRowActions(row)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
