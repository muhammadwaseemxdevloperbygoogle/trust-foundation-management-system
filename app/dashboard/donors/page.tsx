"use client"

import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2, Users, DollarSign, FileText, Eye, Check, ChevronsUpDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  paymentDay?: number
  method: "cash" | "bank_transfer" | "easypaisa" | "jazzcash"
  status: "paid" | "pending" | "missed"
  notes?: string
}

export default function DonorsPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user?.role, "create")
  const canEdit = hasPermission(user?.role, "edit")
  const canDelete = hasPermission(user?.role, "delete")

  // === DONOR STATE ===
  const [donors, setDonors] = useState<DonorItem[]>([])
  const [donorSearch, setDonorSearch] = useState("")
  const [donorStatusFilter, setDonorStatusFilter] = useState<string>("all")
  const [editingDonorId, setEditingDonorId] = useState<string | null>(null)
  const [deletingDonorId, setDeletingDonorId] = useState("")
  const [donorError, setDonorError] = useState("")
  const [donorSuccess, setDonorSuccess] = useState("")
  const [savingDonor, setSavingDonor] = useState(false)

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

  // === PAYMENT STATE ===
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [paymentFilterMode, setPaymentFilterMode] = useState<"month" | "range">("month")
  const [paymentMonth, setPaymentMonth] = useState(String(new Date().getMonth() + 1))
  const [paymentYear, setPaymentYear] = useState(String(new Date().getFullYear()))
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState("")
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false)
  const [editPaymentError, setEditPaymentError] = useState("")
  const [savingPayment, setSavingPayment] = useState(false)

  const today = new Date()
  const [entryData, setEntryData] = useState({
    donorId: "",
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
    day: String(today.getDate()),
    amount: "1000",
    method: "cash" as "cash" | "bank_transfer" | "easypaisa" | "jazzcash",
    receivedBy: user?.name || "Admin",
    notes: "",
    is_previous: false,
    is_advance: false,
  })

  const [entryError, setEntryError] = useState("")
  const [entrySuccess, setEntrySuccess] = useState("")
  const [entrySaving, setEntrySaving] = useState(false)
  const [paymentDonorSearch, setPaymentDonorSearch] = useState("")
  const [isPaymentDonorOpen, setIsPaymentDonorOpen] = useState(false)

  const [editingPaymentData, setEditingPaymentData] = useState({
    amount: "0",
    month: "1",
    year: String(new Date().getFullYear()),
    day: String(new Date().getDate()),
    method: "cash" as "cash" | "bank_transfer" | "easypaisa" | "jazzcash",
    status: "paid" as "paid" | "pending" | "missed",
    receivedBy: "",
    notes: "",
  })

  // === PASSWORD VERIFICATION STATE ===
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: "delete_donor" | "edit_donor" | "delete_payment" | "edit_payment"
    data: DonorItem | PaymentItem | null
  } | null>(null)

  // === LOAD DATA ===
  const loadDonors = async () => {
    const res = await fetch("/api/donors?limit=0")
    const data = await res.json()
    if (!res.ok) {
      setDonorError(data?.error || "Failed to fetch donors")
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

  const loadPayments = async (options?: {
    donorId?: string
    month?: string
    year?: string
    fromDate?: string
    toDate?: string
  }) => {
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
      setEntryError(data?.error || "Failed to load payments")
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
    if (paymentFilterMode === "month") {
      loadPayments({ month: paymentMonth, year: paymentYear })
    } else if (fromDate || toDate) {
      loadPayments({ fromDate, toDate })
    } else {
      setPayments([])
    }
  }, [paymentFilterMode, paymentMonth, paymentYear, fromDate, toDate])

  useEffect(() => {
    if (!user?.name) return
    setEntryData((prev) => ({ ...prev, receivedBy: prev.receivedBy || user.name }))
  }, [user?.name])

  // === FILTERS & SUMMARIES ===
  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      const matchesSearch =
        donor.name.toLowerCase().includes(donorSearch.toLowerCase()) ||
        donor.donorId.toLowerCase().includes(donorSearch.toLowerCase()) ||
        (donor.email || "").toLowerCase().includes(donorSearch.toLowerCase())

      const matchesStatus = donorStatusFilter === "all" || donor.status === donorStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [donors, donorSearch, donorStatusFilter])

  // Filter donors for payment form search
  const filteredPaymentDonors = useMemo(() => {
    return donors.filter((donor) => {
      const searchLower = paymentDonorSearch.toLowerCase()
      return (
        donor.name.toLowerCase().includes(searchLower) ||
        donor.donorId.toLowerCase().includes(searchLower) ||
        (donor.email || "").toLowerCase().includes(searchLower) ||
        donor.phone.toLowerCase().includes(searchLower)
      )
    })
  }, [donors, paymentDonorSearch])

  const paymentsSummary = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const paidRows = payments.filter((p) => p.status === "paid").length
    const uniqueDonors = new Set(
      payments
        .map((p) => (typeof p.donor === "string" ? p.donor : p.donor?._id || ""))
        .filter(Boolean)
    ).size

    return {
      totalAmount,
      paidRows,
      uniqueDonors,
      totalPayments: payments.length,
    }
  }, [payments])

  // === DONOR HANDLERS ===
  const handleAddOrUpdateDonor = async (e: React.FormEvent) => {
    e.preventDefault()
    setDonorError("")
    setSavingDonor(true)
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
      setDonorError(
        data?.error ||
          (isEditMode ? "Failed to update donor" : "Failed to create donor")
      )
      setSavingDonor(false)
      return
    }

    resetDonorForm()
    setSavingDonor(false)
    setDonorSuccess(
      isEditMode ? "Donor updated successfully!" : "Donor added successfully!"
    )
    await loadDonors()
    setTimeout(() => setDonorSuccess(""), 3000)
  }

  const handleEditDonor = (donor: DonorItem) => {
    // Show password modal first
    setPendingAction({ type: "edit_donor", data: donor })
    setIsPasswordModalOpen(true)
    setPasswordInput("")
    setPasswordError("")
  }

  const handleConfirmedEditDonor = (donor: DonorItem) => {
    setEditingDonorId(donor._id)
    setDonorError("")
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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDeleteDonor = (donor: DonorItem) => {
    // Show password modal first
    setPendingAction({ type: "delete_donor", data: donor })
    setIsPasswordModalOpen(true)
    setPasswordInput("")
    setPasswordError("")
  }

  const handleConfirmedDeleteDonor = async (donor: DonorItem) => {
    setDeletingDonorId(donor._id)
    setDonorError("")

    const res = await fetch(`/api/donors/${donor._id}`, {
      method: "DELETE",
    })
    const data = await res.json()

    if (!res.ok) {
      setDonorError(data?.error || "Failed to delete donor")
      setDeletingDonorId("")
      return
    }

    setDeletingDonorId("")
    setDonorSuccess("Donor deleted successfully!")
    await loadDonors()
    setTimeout(() => setDonorSuccess(""), 3000)
  }

  const resetDonorForm = () => {
    setEditingDonorId(null)
    setFormData({
      name: "",
      email: "",
      phone: "",
      cnic: "",
      address: "",
      city: "",
      status: "active",
      monthlyAmount: "1000",
      notes: "",
    })
    setDonorError("")
  }

  // === PAYMENT HANDLERS ===
  const handleEditPayment = (payment: PaymentItem) => {
    // Show password modal first
    setPendingAction({ type: "edit_payment", data: payment })
    setIsPasswordModalOpen(true)
    setPasswordInput("")
    setPasswordError("")
  }

  const handleConfirmedEditPayment = (payment: PaymentItem) => {
    setEditingPaymentId(payment._id)
    setEditPaymentError("")
    setEditingPaymentData({
      amount: String(payment.amount),
      month: String(payment.month),
      year: String(payment.year),
      day: String(payment.paymentDay || 1),
      method: payment.method,
      status: payment.status,
      receivedBy: "",
      notes: payment.notes || "",
    })
    setIsEditPaymentOpen(true)
  }

  const handleDeletePayment = (payment: PaymentItem) => {
    // Show password modal first
    setPendingAction({ type: "delete_payment", data: payment })
    setIsPasswordModalOpen(true)
    setPasswordInput("")
    setPasswordError("")
  }

  const handleConfirmedDeletePayment = async (payment: PaymentItem) => {
    setDeletingPaymentId(payment._id)

    const res = await fetch(`/api/payments/${payment._id}`, {
      method: "DELETE",
    })
    const data = await res.json()

    if (!res.ok) {
      setEntryError(data?.error || "Failed to delete payment")
      setDeletingPaymentId("")
      return
    }

    setDeletingPaymentId("")
    setEntrySuccess("Payment deleted successfully!")
    if (paymentFilterMode === "month") {
      await loadPayments({ month: paymentMonth, year: paymentYear })
    } else if (fromDate || toDate) {
      await loadPayments({ fromDate, toDate })
    }
    setTimeout(() => setEntrySuccess(""), 3000)
  }

  const handlePaymentEditSubmit = async () => {
    if (!editingPaymentId || savingPayment) return

    setEditPaymentError("")
    setSavingPayment(true)

    const res = await fetch(`/api/payments/${editingPaymentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(editingPaymentData.amount),
        month: Number(editingPaymentData.month),
        year: Number(editingPaymentData.year),
        paymentDay: editingPaymentData.day ? Number(editingPaymentData.day) : undefined,
        method: editingPaymentData.method,
        status: editingPaymentData.status,
        receivedBy: editingPaymentData.receivedBy || user?.name || "Admin",
        notes: editingPaymentData.notes,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setEditPaymentError(data?.error || "Failed to update payment")
      setSavingPayment(false)
      return
    }

    setIsEditPaymentOpen(false)
    setEditingPaymentId(null)
    setEditingPaymentData({
      amount: "0",
      month: "1",
      year: String(new Date().getFullYear()),
      day: String(new Date().getDate()),
      method: "cash",
      status: "paid",
      receivedBy: "",
      notes: "",
    })
    setSavingPayment(false)
    setEditPaymentError("")
    setEntrySuccess("Payment updated successfully!")
    if (paymentFilterMode === "month") {
      await loadPayments({ month: paymentMonth, year: paymentYear })
    } else if (fromDate || toDate) {
      await loadPayments({ fromDate, toDate })
    }
    setTimeout(() => setEntrySuccess(""), 3000)
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
        paymentDay: entryData.day ? Number(entryData.day) : undefined,
        method: entryData.method,
        receivedBy: entryData.receivedBy || user?.name || "Admin",
        notes: entryData.notes,
        is_previous: entryData.is_previous,
        is_advance: entryData.is_advance,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setEntryError(data?.error || "Failed to save payment")
      setEntrySaving(false)
      return
    }

    const createdCount = Number(data?.createdCount || 1)
    setEntrySuccess(
      createdCount > 1
        ? `${createdCount} payment rows saved!`
        : "Payment saved successfully!"
    )
    if (createdCount > 1) {
      window.alert(`${createdCount} payment rows saved successfully.`)
    }
    setEntryData((prev) => ({ ...prev, notes: "" }))
    if (paymentFilterMode === "month") {
      await loadPayments({ month: paymentMonth, year: paymentYear })
    } else if (fromDate || toDate) {
      await loadPayments({ fromDate, toDate })
    }
    setEntrySaving(false)
    setTimeout(() => setEntrySuccess(""), 3000)
  }

  // === PASSWORD VERIFICATION ===
  const handleVerifyPassword = async () => {
    if (!passwordInput.trim()) {
      setPasswordError("Password is required")
      return
    }

    if (!user?.id) {
      setPasswordError("User session is missing. Please sign in again.")
      return
    }

    setVerifyingPassword(true)
    setPasswordError("")

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          password: passwordInput,
        }),
      })

      let data: { error?: string } | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        setPasswordError(data?.error || "Password verification failed")
        return
      }

      // Password verified, proceed with the pending action
      setIsPasswordModalOpen(false)
      setPasswordInput("")
      setPasswordError("")

      if (!pendingAction) return

      if (pendingAction.type === "delete_donor" && pendingAction.data) {
        await handleConfirmedDeleteDonor(pendingAction.data as DonorItem)
      } else if (pendingAction.type === "edit_donor" && pendingAction.data) {
        handleConfirmedEditDonor(pendingAction.data as DonorItem)
      } else if (pendingAction.type === "delete_payment" && pendingAction.data) {
        await handleConfirmedDeletePayment(pendingAction.data as PaymentItem)
      } else if (pendingAction.type === "edit_payment" && pendingAction.data) {
        handleConfirmedEditPayment(pendingAction.data as PaymentItem)
      }

      setPendingAction(null)
    } catch {
      setPasswordError("Unable to verify password. Please try again.")
    } finally {
      setVerifyingPassword(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-1 sm:gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Donors Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage donors, record payments, and view donation history
        </p>
      </div>

      {/* MAIN TABS */}
      <Tabs defaultValue="donor-list" className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-0.5 sm:gap-1 p-1 sm:p-2">
          <TabsTrigger value="donor-list" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Users className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span className="hidden sm:inline">Donor List</span>
            <span className="sm:hidden">List</span>
          </TabsTrigger>
          <TabsTrigger value="add-donor" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span className="hidden sm:inline">Add Donor</span>
            <span className="sm:hidden">Add</span>
          </TabsTrigger>
          <TabsTrigger value="payment-form" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <DollarSign className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span className="hidden sm:inline">Payment Form</span>
            <span className="sm:hidden">Pay</span>
          </TabsTrigger>
          <TabsTrigger value="donations" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Eye className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span className="hidden sm:inline">Donations</span>
            <span className="sm:hidden">View</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DONOR LIST */}
        <TabsContent value="donor-list" className="space-y-3 sm:space-y-4">
          <Card className="border-0 sm:border">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-2xl">Donor List</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and manage all donors in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {donorSuccess && (
                <div className="rounded-md bg-green-50 p-2 sm:p-3 text-xs sm:text-sm text-green-800">
                  {donorSuccess}
                </div>
              )}
              {donorError && (
                <div className="rounded-md bg-red-50 p-2 sm:p-3 text-xs sm:text-sm text-red-800">
                  {donorError}
                </div>
              )}

              {/* FILTERS */}
              <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                <Input
                  placeholder="Search by name, ID, or email..."
                  value={donorSearch}
                  onChange={(e) => setDonorSearch(e.target.value)}
                />
                <Select value={donorStatusFilter} onValueChange={setDonorStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DONOR TABLE */}
              <div className="rounded-md border overflow-hidden -mx-6 sm:mx-0">
                <div className="hidden md:block overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>Donor ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Monthly</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDonors.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No donors found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDonors.map((donor) => (
                          <TableRow key={donor._id} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-primary">
                              <Link href={`/dashboard/donors/${donor._id}`} className="hover:underline">
                                {donor.donorId}
                              </Link>
                            </TableCell>
                            <TableCell className="font-medium">
                              {donor.name}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{donor.phone}</div>
                              <div className="text-xs text-muted-foreground">
                                {donor.email || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {donor.city || "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatPKR(donor.monthlyAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  donor.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {donor.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditDonor(donor)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={deletingDonorId === donor._id}
                                    onClick={() => handleDeleteDonor(donor)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* MOBILE VIEW */}
                <div className="md:hidden space-y-2 p-4">
                  {filteredDonors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No donors found
                    </div>
                  ) : (
                    filteredDonors.map((donor) => (
                      <div
                        key={donor._id}
                        className="rounded-md border p-2 sm:p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/dashboard/donors/${donor._id}`} className="font-bold text-primary hover:underline">
                              {donor.donorId}
                            </Link>
                            <p className="font-medium">{donor.name}</p>
                          </div>
                          <Badge
                            variant={
                              donor.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {donor.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {donor.phone} • {donor.email || "-"}
                        </p>
                        <p className="text-sm font-semibold">
                          {formatPKR(donor.monthlyAmount)}
                        </p>
                        <div className="flex gap-2 pt-2">
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleEditDonor(donor)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              disabled={deletingDonorId === donor._id}
                              onClick={() => handleDeleteDonor(donor)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-2 px-0.5 sm:px-0">
                Total: {filteredDonors.length} donor{filteredDonors.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ADD DONOR */}
        <TabsContent value="add-donor" className="space-y-3 sm:space-y-4">
          <Card className="border-0 sm:border">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-2xl">
                {editingDonorId ? "Edit Donor" : "Add New Donor"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {editingDonorId
                  ? "Update donor information"
                  : "Register a new donor in the system"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {donorSuccess && (
                <div className="rounded-md bg-green-50 p-2 sm:p-3 text-xs sm:text-sm text-green-800 mb-3 sm:mb-4">
                  {donorSuccess}
                </div>
              )}
              {donorError && (
                <div className="rounded-md bg-red-50 p-2 sm:p-3 text-xs sm:text-sm text-red-800 mb-3 sm:mb-4">
                  {donorError}
                </div>
              )}

              <form onSubmit={handleAddOrUpdateDonor} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Field>
                    <FieldLabel htmlFor="name">Full Name *</FieldLabel>
                    <Input
                      id="name"
                      placeholder="Enter donor name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="phone">Phone Number *</FieldLabel>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="03xx-xxxxxxx"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="donor@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cnic">CNIC</FieldLabel>
                    <Input
                      id="cnic"
                      placeholder="12345-1234567-1"
                      value={formData.cnic}
                      onChange={(e) =>
                        setFormData({ ...formData, cnic: e.target.value })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="address">Address</FieldLabel>
                    <Input
                      id="address"
                      placeholder="Street address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Input
                      id="city"
                      placeholder="City name"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="amount">Monthly Amount (PKR) *</FieldLabel>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="1000"
                      value={formData.monthlyAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyAmount: e.target.value,
                        })
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "inactive") =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="notes">Notes</FieldLabel>
                  <Input
                    id="notes"
                    placeholder="Any additional notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </Field>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <Button type="submit" disabled={savingDonor} className="flex-1 text-sm sm:text-base h-9 sm:h-10">
                    {savingDonor ? (
                      <>Loading...</>
                    ) : editingDonorId ? (
                      <>
                        <Pencil className="mr-2 h-4 w-4" />
                        Update Donor
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Donor
                      </>
                    )}
                  </Button>
                  {editingDonorId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetDonorForm}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PAYMENT FORM */}
        <TabsContent value="payment-form" className="space-y-3 sm:space-y-4">
          <Card className="border-0 sm:border">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-2xl">Payment Entry Form</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Record a new payment for any donor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {entryError && (
                <div className="rounded-md bg-red-50 p-2 sm:p-3 text-xs sm:text-sm text-red-800">
                  {entryError}
                </div>
              )}
              {entrySuccess && (
                <div className="rounded-md bg-green-50 p-2 sm:p-3 text-xs sm:text-sm text-green-800">
                  {entrySuccess}
                </div>
              )}

              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Field>
                    <FieldLabel htmlFor="donor">Select Donor *</FieldLabel>
                    <Popover open={isPaymentDonorOpen} onOpenChange={setIsPaymentDonorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isPaymentDonorOpen}
                          className="w-full justify-between"
                        >
                          {entryData.donorId
                            ? donors.find((d) => d._id === entryData.donorId)?.donorId +
                              " - " +
                              donors.find((d) => d._id === entryData.donorId)?.name
                            : "Choose a donor..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search donor by name, ID, email, or phone..."
                            value={paymentDonorSearch}
                            onValueChange={setPaymentDonorSearch}
                          />
                          <CommandEmpty>No donor found.</CommandEmpty>
                          <ScrollArea className="h-64">
                            <CommandGroup>
                              {filteredPaymentDonors.map((donor) => (
                                <CommandItem
                                  key={donor._id}
                                  value={donor._id}
                                  onSelect={(currentValue) => {
                                    setEntryData((prev) => ({
                                      ...prev,
                                      donorId: currentValue,
                                      amount: String(donor.monthlyAmount || prev.amount),
                                    }))
                                    setPaymentDonorSearch("")
                                    setIsPaymentDonorOpen(false)
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      entryData.donorId === donor._id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{donor.donorId} - {donor.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {donor.phone} • {donor.email || "-"}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </ScrollArea>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="amount">Amount (PKR) *</FieldLabel>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={entryData.amount}
                      onChange={(e) =>
                        setEntryData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="month">Month *</FieldLabel>
                    <Input
                      id="month"
                      type="number"
                      min="1"
                      max="12"
                      value={entryData.month}
                      onChange={(e) =>
                        setEntryData((prev) => ({
                          ...prev,
                          month: e.target.value,
                        }))
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="year">Year *</FieldLabel>
                    <Input
                      id="year"
                      type="number"
                      min="2000"
                      max="2100"
                      value={entryData.year}
                      onChange={(e) =>
                        setEntryData((prev) => ({
                          ...prev,
                          year: e.target.value,
                        }))
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="day">Day (1-31)</FieldLabel>
                    <Input
                      id="day"
                      type="number"
                      min="1"
                      max="31"
                      value={entryData.day}
                      onChange={(e) =>
                        setEntryData((prev) => ({
                          ...prev,
                          day: e.target.value,
                        }))
                      }
                      placeholder="Day of payment"
                    />
                  </Field>

                  <Field>
                    <Select
                      value={entryData.method}
                      onValueChange={(
                        value: "cash" | "bank_transfer" | "easypaisa" | "jazzcash"
                      ) =>
                        setEntryData((prev) => ({ ...prev, method: value }))
                      }
                    >
                      <SelectTrigger id="method">
                        <SelectValue placeholder="Choose method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="received-by">Received By</FieldLabel>
                    <Input
                      id="received-by"
                      placeholder="Officer name"
                      value={entryData.receivedBy}
                      onChange={(e) =>
                        setEntryData((prev) => ({
                          ...prev,
                          receivedBy: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="notes">Notes</FieldLabel>
                  <Input
                    id="notes"
                    placeholder="Any additional notes"
                    value={entryData.notes}
                    onChange={(e) =>
                      setEntryData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </Field>

                <div className="space-y-2 sm:space-y-3 pt-2">
                  <Label className="text-sm sm:text-base font-semibold">
                    Payment Type Options
                  </Label>
                  <div className="flex flex-col gap-2 sm:gap-3 md:flex-row">
                    <Label className="flex items-center gap-2 cursor-pointer">
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
                      <span className="text-sm">
                        Previous Month(s) Payment
                      </span>
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer">
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
                      <span className="text-sm">Advance Payment</span>
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check if this payment should be split across months
                  </p>
                </div>

                <Button
                  onClick={handleEntrySubmit}
                  disabled={entrySaving}
                  className="w-full md:w-auto text-sm sm:text-base h-9 sm:h-10"
                >
                  {entrySaving ? "Saving..." : "Save Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: DONATIONS VIEW */}
        <TabsContent value="donations" className="space-y-3 sm:space-y-4">
          <Card className="border-0 sm:border">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-2xl">Donations View</CardTitle>
              <CardDescription className="text-xs sm:text-sm">View and manage all payment records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* FILTER SECTION */}
              <div className="bg-muted p-3 sm:p-4 rounded-md space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Filter by:</span>
                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant={
                        paymentFilterMode === "month" ? "default" : "outline"
                      }
                      onClick={() => setPaymentFilterMode("month")}
                      className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                    >
                      Month
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        paymentFilterMode === "range" ? "default" : "outline"
                      }
                      onClick={() => setPaymentFilterMode("range")}
                      className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                    >
                      Date Range
                    </Button>
                  </div>
                </div>

                {paymentFilterMode === "month" ? (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:max-w-md">
                    <Field>
                      <FieldLabel htmlFor="filter-month" className="text-xs">
                        Month
                      </FieldLabel>
                      <Input
                        id="filter-month"
                        type="number"
                        min="1"
                        max="12"
                        value={paymentMonth}
                        onChange={(e) => setPaymentMonth(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="filter-year" className="text-xs">
                        Year
                      </FieldLabel>
                      <Input
                        id="filter-year"
                        type="number"
                        min="2000"
                        max="2100"
                        value={paymentYear}
                        onChange={(e) => setPaymentYear(e.target.value)}
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:max-w-md">
                    <Field>
                      <FieldLabel htmlFor="from-date" className="text-xs">
                        From
                      </FieldLabel>
                      <Input
                        id="from-date"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="to-date" className="text-xs">
                        To
                      </FieldLabel>
                      <Input
                        id="to-date"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </div>

              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="rounded-md border p-2 sm:p-3">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-base sm:text-lg font-bold text-primary">
                    {formatPKR(paymentsSummary.totalAmount)}
                  </p>
                </div>
                <div className="rounded-md border p-2 sm:p-3">
                  <p className="text-xs text-muted-foreground">Paid Records</p>
                  <p className="text-base sm:text-lg font-bold">{paymentsSummary.paidRows}</p>
                </div>
                <div className="rounded-md border p-2 sm:p-3">
                  <p className="text-xs text-muted-foreground">Unique Donors</p>
                  <p className="text-base sm:text-lg font-bold">{paymentsSummary.uniqueDonors}</p>
                </div>
                <div className="rounded-md border p-2 sm:p-3">
                  <p className="text-xs text-muted-foreground">Total Records</p>
                  <p className="text-base sm:text-lg font-bold">{paymentsSummary.totalPayments}</p>
                </div>
              </div>

              {/* PAYMENTS TABLE */}
              <div className="rounded-md border overflow-hidden -mx-6 sm:mx-0">
                <div className="hidden md:block overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Donor</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-12 text-center text-muted-foreground"
                          >
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : payments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No donations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((payment) => {
                          const donorName =
                            typeof payment.donor === "string"
                              ? payment.donor
                              : `${payment.donor?.donorId || ""} ${
                                  payment.donor?.name || ""
                                }`.trim() || "-"
                          return (
                            <TableRow
                              key={payment._id}
                              className="hover:bg-muted/50"
                            >
                              <TableCell className="font-medium text-primary">
                                {payment.paymentId}
                              </TableCell>
                              <TableCell>{donorName}</TableCell>
                              <TableCell className="text-sm">
                                {payment.paymentDay 
                                  ? `${payment.month}/${payment.year} (Day ${payment.paymentDay})`
                                  : `${payment.month}/${payment.year}`}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatPKR(payment.amount)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {payment.method}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    payment.status === "paid"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {payment.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {canEdit && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleEditPayment(payment)
                                      }
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={
                                        deletingPaymentId === payment._id
                                      }
                                      onClick={() =>
                                        handleDeletePayment(payment)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* MOBILE VIEW */}
                <div className="md:hidden space-y-2 p-4">
                  {paymentsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading...
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No donations found
                    </div>
                  ) : (
                    payments.map((payment) => {
                      const donorName =
                        typeof payment.donor === "string"
                          ? payment.donor
                          : `${payment.donor?.donorId || ""} ${
                              payment.donor?.name || ""
                            }`.trim() || "-"
                      return (
                        <div
                          key={payment._id}
                          className="rounded-md border p-2 sm:p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-primary">
                                {payment.paymentId}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {donorName}
                              </p>
                            </div>
                            <Badge
                              variant={
                                payment.status === "paid"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Period: {payment.paymentDay 
                                ? `${payment.month}/${payment.year} (Day ${payment.paymentDay})`
                                : `${payment.month}/${payment.year}`}
                            </p>
                            <p>Method: {payment.method}</p>
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            {formatPKR(payment.amount)}
                          </p>
                          <div className="flex gap-2 pt-2">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleEditPayment(payment)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                disabled={deletingPaymentId === payment._id}
                                onClick={() => handleDeletePayment(payment)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT PAYMENT SHEET */}
      <Sheet open={isEditPaymentOpen} onOpenChange={setIsEditPaymentOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg sm:text-xl">Edit Payment</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">Update payment details</SheetDescription>
          </SheetHeader>
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {editPaymentError && (
              <div className="rounded-md bg-red-50 p-2 sm:p-3 text-xs sm:text-sm text-red-800">
                {editPaymentError}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-amount">Amount (PKR)</FieldLabel>
                <Input
                  id="edit-amount"
                  type="number"
                  min="1"
                  value={editingPaymentData.amount}
                  onChange={(e) =>
                    setEditingPaymentData({
                      ...editingPaymentData,
                      amount: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-month">Month</FieldLabel>
                <Input
                  id="edit-month"
                  type="number"
                  min="1"
                  max="12"
                  value={editingPaymentData.month}
                  onChange={(e) =>
                    setEditingPaymentData({
                      ...editingPaymentData,
                      month: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-year">Year</FieldLabel>
                <Input
                  id="edit-year"
                  type="number"
                  min="2000"
                  max="2100"
                  value={editingPaymentData.year}
                  onChange={(e) =>
                    setEditingPaymentData({
                      ...editingPaymentData,
                      year: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-day">Day (1-31)</FieldLabel>
                <Input
                  id="edit-day"
                  type="number"
                  min="1"
                  max="31"
                  value={editingPaymentData.day}
                  onChange={(e) =>
                    setEditingPaymentData({
                      ...editingPaymentData,
                      day: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-method">Method</FieldLabel>
                <Select
                  value={editingPaymentData.method}
                  onValueChange={(
                    value: "cash" | "bank_transfer" | "easypaisa" | "jazzcash"
                  ) =>
                    setEditingPaymentData({
                      ...editingPaymentData,
                      method: value,
                    })
                  }
                >
                  <SelectTrigger id="edit-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-status">Status</FieldLabel>
                <Select
                  value={editingPaymentData.status}
                  onValueChange={(value: "paid" | "pending" | "missed") =>
                    setEditingPaymentData({
                      ...editingPaymentData,
                      status: value,
                    })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-notes">Notes</FieldLabel>
                <Input
                  id="edit-notes"
                  placeholder="Optional notes"
                  value={editingPaymentData.notes}
                  onChange={(e) =>
                    setEditingPaymentData({
                      ...editingPaymentData,
                      notes: e.target.value,
                    })
                  }
                />
              </Field>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handlePaymentEditSubmit}
                  disabled={savingPayment}
                  className="flex-1"
                >
                  {savingPayment ? "Saving..." : "Update Payment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditPaymentOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </div>
        </SheetContent>
      </Sheet>

      {/* PASSWORD VERIFICATION MODAL */}
      <Sheet open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-lg sm:text-xl">Confirm Password</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Enter your password to confirm this action
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 sm:mt-6 space-y-4">
            {passwordError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {passwordError}
              </div>
            )}
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !verifyingPassword) {
                    handleVerifyPassword()
                  }
                }}
                disabled={verifyingPassword}
              />
            </Field>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPasswordModalOpen(false)
                  setPasswordInput("")
                  setPasswordError("")
                  setPendingAction(null)
                }}
                disabled={verifyingPassword}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyPassword}
                disabled={verifyingPassword}
                className="flex-1"
              >
                {verifyingPassword ? "Verifying..." : "Confirm"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
