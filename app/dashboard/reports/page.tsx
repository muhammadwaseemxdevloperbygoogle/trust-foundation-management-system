"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, FileText, RefreshCw, Printer, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, formatPKR } from "@/src/lib/waqf-utils"

type Settings = {
  applicationName: string
  trustName: string
  tagline?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  registrationNumber?: string
}

type DonorOption = {
  _id: string
  donorId: string
  name: string
  phone?: string
  city?: string
  status?: "active" | "inactive"
  monthlyAmount?: number
}

type PaymentReportRow = {
  _id: string
  paymentId: string
  paymentNo?: string
  amount: number
  month: number
  year: number
  paymentDate: string
  status: "paid" | "pending" | "missed"
  method: string
  notes?: string
  donor: {
    _id: string
    donorId: string
    name: string
    phone?: string
  }
}

type PaymentReportResponse = {
  payments: PaymentReportRow[]
}

function toCsv(rows: PaymentReportRow[]) {
  const header = [
    "donorId",
    "donorName",
    "paymentId",
    "paymentNo",
    "paymentDate",
    "month",
    "year",
    "status",
    "method",
    "amount",
  ]

  const body = rows.map((row) => [
    row.donor.donorId,
    `"${row.donor.name.replace(/"/g, '""')}"`,
    row.paymentId,
    row.paymentNo || "",
    row.paymentDate,
    row.month,
    row.year,
    row.status,
    row.method,
    row.amount,
  ].join(","))

  return [header.join(","), ...body].join("\n")
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function monthName(month: number) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(2026, month - 1, 1))
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [donors, setDonors] = useState<DonorOption[]>([])
  const [selectedDonorId, setSelectedDonorId] = useState<string>("all")
  const [fromDate, setFromDate] = useState(startOfMonth)
  const [toDate, setToDate] = useState(today)
  const [payments, setPayments] = useState<PaymentReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [donorsLoading, setDonorsLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastGeneratedAt, setLastGeneratedAt] = useState("")
  const [settings, setSettings] = useState<Settings | null>(null)
  
  // Payments Details state
  const [paymentsDetailYear, setPaymentsDetailYear] = useState(String(new Date().getFullYear()))
  const [monthlyPayments, setMonthlyPayments] = useState<Record<number, PaymentReportRow[]>>({})
  const [paymentsDetailLoading, setPaymentsDetailLoading] = useState(false)
  const [paymentsDetailError, setPaymentsDetailError] = useState("")

  // Payment Status Report state
  const [statusReportMonth, setStatusReportMonth] = useState(String(new Date().getMonth() + 1))
  const [statusReportYear, setStatusReportYear] = useState(String(new Date().getFullYear()))
  const [statusReportFromDate, setStatusReportFromDate] = useState("")
  const [statusReportToDate, setStatusReportToDate] = useState("")
  const [statusReportShowPending, setStatusReportShowPending] = useState(true)
  const [statusReportShowPaid, setStatusReportShowPaid] = useState(true)
  const [statusReportData, setStatusReportData] = useState<PaymentReportRow[]>([])
  const [statusReportLoading, setStatusReportLoading] = useState(false)
  const [statusReportError, setStatusReportError] = useState("")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings")
        if (!res.ok) throw new Error("Failed to load settings")
        const data = await res.json()
        setSettings(data?.settings || null)
      } catch {
        // Settings load failed, continue without them
      }
    }

    void loadSettings()
  }, [])

  useEffect(() => {
    const loadDonors = async () => {
      setDonorsLoading(true)
      try {
        const res = await fetch("/api/donors?limit=0")
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load donors")
        }
        setDonors(Array.isArray(data.donors) ? data.donors : [])
      } catch {
        setError("Failed to load donor list")
      } finally {
        setDonorsLoading(false)
      }
    }

    void loadDonors()
  }, [])

  const loadReport = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (selectedDonorId && selectedDonorId !== "all") {
        params.set("donorId", selectedDonorId)
      }
      if (fromDate) params.set("fromDate", fromDate)
      if (toDate) params.set("toDate", toDate)

      const res = await fetch(`/api/payments?${params.toString()}`)
      const data: PaymentReportResponse = await res.json()

      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "Failed to load report")
      }

      setPayments(Array.isArray(data.payments) ? data.payments : [])
      setLastGeneratedAt(new Date().toLocaleString())
    } catch (fetchError) {
      setPayments([])
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!donorsLoading) {
      void loadReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donorsLoading])

  const loadPaymentsDetails = async (year: string) => {
    setPaymentsDetailLoading(true)
    setPaymentsDetailError("")
    try {
      const yearNum = Number(year)
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`
      
      const params = new URLSearchParams()
      params.set("fromDate", yearStart)
      params.set("toDate", yearEnd)

      const res = await fetch(`/api/payments?${params.toString()}`)
      const data: PaymentReportResponse = await res.json()

      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "Failed to load payment details")
      }

      // Group payments by month
      const grouped: Record<number, PaymentReportRow[]> = {}
      for (let month = 1; month <= 12; month++) {
        grouped[month] = []
      }

      if (Array.isArray(data.payments)) {
        for (const payment of data.payments) {
          if (payment.year === yearNum) {
            const monthPayments = grouped[payment.month] || []
            monthPayments.push(payment)
            grouped[payment.month] = monthPayments
          }
        }
      }

      setMonthlyPayments(grouped)
    } catch (fetchError) {
      setMonthlyPayments({})
      setPaymentsDetailError(fetchError instanceof Error ? fetchError.message : "Failed to load payment details")
    } finally {
      setPaymentsDetailLoading(false)
    }
  }

  useEffect(() => {
    void loadPaymentsDetails(paymentsDetailYear)
  }, [paymentsDetailYear])

  const selectedDonor = useMemo(() => {
    if (selectedDonorId === "all") return null
    return donors.find((donor) => donor._id === selectedDonorId) || null
  }, [donors, selectedDonorId])

  const donorDirectory = useMemo(() => {
    return [...donors].sort((a, b) => a.donorId.localeCompare(b.donorId))
  }, [donors])

  const summary = useMemo(() => {
    const totalRows = payments.length
    const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const donorsInReport = new Set(payments.map((payment) => payment.donor._id)).size

    return {
      totalRows,
      totalAmount,
      donorsInReport,
    }
  }, [payments])

  const donorBreakdown = useMemo(() => {
    const grouped = new Map<string, { donorId: string; donorName: string; count: number; amount: number }>()

    for (const payment of payments) {
      const existing = grouped.get(payment.donor._id)
      if (existing) {
        existing.count += 1
        existing.amount += Number(payment.amount || 0)
        continue
      }

      grouped.set(payment.donor._id, {
        donorId: payment.donor.donorId,
        donorName: payment.donor.name,
        count: 1,
        amount: Number(payment.amount || 0),
      })
    }

    return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount)
  }, [payments])

  const exportCsv = () => {
    if (payments.length === 0) return
    downloadFile(toCsv(payments), `report-${selectedDonorId === "all" ? "all-donors" : selectedDonor?.donorId || "donor"}.csv`, "text/csv;charset=utf-8")
  }

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=800,width=900")
    if (!printWindow) {
      alert("Please allow pop-ups to print the report")
      return
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Donor Report - ${selectedDonor ? escapeHtml(selectedDonor.name) : "All Donors"}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .print-header { 
              text-align: center;
              border-bottom: 2px solid #000; 
              margin-bottom: 20px; 
              padding-bottom: 15px;
            }
            .print-header h1 { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; }
            .print-header p { font-size: 12px; color: #666; margin: 0; }
            .report-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
              font-size: 12px;
            }
            .report-details div { padding: 8px; background: #f5f5f5; }
            .report-details label { font-weight: bold; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
            }
            table thead { background: #f0f0f0; }
            table th, table td { 
              padding: 8px; 
              text-align: left; 
              border: 1px solid #ddd; 
              font-size: 11px;
            }
            table th { font-weight: bold; }
            table tr:nth-child(even) { background: #fafafa; }
            .summary-section {
              margin-top: 20px;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .summary-item.total {
              font-weight: bold;
              border-top: 1px solid #333;
              border-bottom: 2px solid #333;
              padding: 5px 0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #999;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${settings?.trustName || "Waqf Trust"}</h1>
            <p>${settings?.tagline || "Donation Management System"}</p>
            <div style="font-size: 11px; color: #666; margin-top: 8px;">
              ${settings?.address ? `<p>${settings.address}${settings.city ? ", " + settings.city : ""}</p>` : ""}
              ${settings?.phone ? `<p>Phone: ${settings.phone}</p>` : ""}
              ${settings?.email ? `<p>Email: ${settings.email}</p>` : ""}
              ${settings?.registrationNumber ? `<p>Reg#: ${settings.registrationNumber}</p>` : ""}
            </div>
          </div>

          <div style="text-align: center; margin: 20px 0; border-bottom: 1px solid #999; padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 16px;">Donor Donation Report</h2>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">Generated on ${new Date().toLocaleString()}</p>
          </div>

          <div class="report-details">
            <div>
              <label>Donor:</label>
              <p>${selectedDonor ? `${escapeHtml(selectedDonor.name)} (${escapeHtml(selectedDonor.donorId)})` : "All Donors"}</p>
            </div>
            <div>
              <label>Date Range:</label>
              <p>${fromDate} to ${toDate}</p>
            </div>
            <div>
              <label>Total Donations:</label>
              <p>${summary.totalRows}</p>
            </div>
            <div>
              <label>Total Amount:</label>
              <p>${formatPKR(summary.totalAmount)}</p>
            </div>
          </div>

          ${payments.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Donor</th>
                  <th>Month/Year</th>
                  <th>Status</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map((payment) => `
                  <tr>
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td>${escapeHtml(payment.donor.name)}<br/><small>${escapeHtml(payment.donor.donorId)}</small></td>
                    <td>${monthName(payment.month)} ${payment.year}</td>
                    <td>${payment.status}</td>
                    <td style="text-align: right;">${formatPKR(payment.amount)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          ` : "<p>No records found.</p>"}

          <div class="summary-section">
            <div class="summary-item">
              <span>Total Donations:</span>
              <span>${summary.totalRows}</span>
            </div>
            <div class="summary-item">
              <span>Number of Donors:</span>
              <span>${summary.donorsInReport}</span>
            </div>
            <div class="summary-item total">
              <span>Total Amount:</span>
              <span>${formatPKR(summary.totalAmount)}</span>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 8px 0; font-weight: bold;">Generated by Wasi Foundation Management System</p>
            <p style="margin: 0 0 3px 0;">📞 Contact: 03192173398</p>
            <p style="margin: 0 0 8px 0;">Developer: Mr Wasi Dev</p>
            <p style="margin: 0; border-top: 1px solid #ddd; padding-top: 8px;">This is a computer-generated report. Print or save this page for your records.</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handlePrintDonorDirectory = () => {
    const printWindow = window.open("", "", "height=800,width=900")
    if (!printWindow) {
      alert("Please allow pop-ups to print the donor list")
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Donor Directory Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .print-header {
              text-align: center;
              border-bottom: 2px solid #000;
              margin-bottom: 18px;
              padding-bottom: 12px;
            }
            .print-header h1 { font-size: 20px; margin: 0 0 4px 0; }
            .print-header p { font-size: 12px; color: #666; margin: 0; }
            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .meta div { background: #f5f5f5; padding: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
            th { background: #f0f0f0; text-align: left; }
            tr:nth-child(even) { background: #fafafa; }
            .footer {
              margin-top: 20px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${settings?.trustName || "Waqf Trust"}</h1>
            <p>${settings?.tagline || "Donation Management System"}</p>
            <p>Donor Directory Report</p>
          </div>

          <div class="meta">
            <div><strong>Total Donors:</strong> ${donorDirectory.length}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Donor ID</th>
                <th>Name</th>
                <th style="text-align:right;">Monthly Amount</th>
              </tr>
            </thead>
            <tbody>
              ${donorDirectory.map((donor, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(donor.donorId)}</td>
                  <td>${escapeHtml(donor.name)}</td>
                  <td style="text-align:right;">${formatPKR(Number(donor.monthlyAmount || 1000))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            <p style="font-weight: bold; margin-bottom: 4px;">Generated by Wasi Foundation Management System</p>
            <p>Contact: 03192173398 | Developer: Mr Wasi Dev</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
  }

  // Load Payment Status Report
  const loadStatusReport = async () => {
    setStatusReportLoading(true)
    setStatusReportError("")

    try {
      const year = Number(statusReportYear)
      const month = Number(statusReportMonth)
      const firstDay = new Date(year, month - 1, 1).toISOString().slice(0, 10)
      const lastDay = new Date(year, month, 0).toISOString().slice(0, 10)

      // Load all active donors
      const donorsRes = await fetch("/api/donors?limit=0&status=active")
      const donorsData = await donorsRes.json()
      if (!donorsRes.ok) {
        throw new Error("Failed to load donors")
      }
      const activeDonors = Array.isArray(donorsData.donors) ? donorsData.donors : []

      // Load payments for the selected month/year
      const dateQuery = `?fromDate=${firstDay}&toDate=${lastDay}`
      const res = await fetch(`/api/payments${dateQuery}`)
      const data: PaymentReportResponse = await res.json()

      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "Failed to load report")
      }

      let existingPayments = Array.isArray(data.payments) ? data.payments : []

      // Create a map of donors who have payments
      const donorsWithPayments = new Set(existingPayments.map(p => p.donor._id))

      // Create synthetic "pending" records for donors without payments
      const pendingRecords: PaymentReportRow[] = activeDonors
        .filter((donor: DonorOption) => !donorsWithPayments.has(donor._id))
        .map((donor: DonorOption) => ({
          _id: `pending-${donor._id}-${month}-${year}`,
          paymentId: `pending-${donor._id}`,
          amount: Number(donor.monthlyAmount || 1000),
          month,
          year,
          paymentDate: new Date(year, month - 1, 1).toISOString(),
          status: "pending" as const,
          method: "pending",
          donor: {
            _id: donor._id,
            donorId: donor.donorId,
            name: donor.name,
            phone: donor.phone,
          },
        }))

      // Combine existing payments and pending records
      let allRecords = [...existingPayments, ...pendingRecords]

      // Filter by status
      if (statusReportShowPending && !statusReportShowPaid) {
        allRecords = allRecords.filter(p => p.status === "pending")
      } else if (statusReportShowPaid && !statusReportShowPending) {
        allRecords = allRecords.filter(p => p.status === "paid")
      }
      // If both checked, show all

      setStatusReportData(allRecords)
    } catch (error) {
      setStatusReportData([])
      setStatusReportError(error instanceof Error ? error.message : "Failed to load report")
    } finally {
      setStatusReportLoading(false)
    }
  }

  // Print Payment Status Report
  const handlePrintStatusReport = () => {
    if (statusReportData.length === 0) {
      alert("No data to print")
      return
    }

    const printWindow = window.open("", "", "height=800,width=1000")
    if (!printWindow) {
      alert("Please allow pop-ups to print the report")
      return
    }

    const rows = statusReportData.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.donor.donorId)}</td>
        <td>${escapeHtml(row.donor.name)}</td>
        <td style="text-align: center;">${row.month}/${row.year}</td>
        <td style="text-align: right;">${formatPKR(row.amount)}</td>
        <td style="text-align: center; color: ${row.status === "paid" ? "green" : "orange"}; font-weight: bold;">
          ${row.status === "paid" ? "✓ PAID" : "⏳ PENDING"}
        </td>
        <td>${escapeHtml(row.method)}</td>
      </tr>
    `).join("")

    const totalAmount = statusReportData.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const paidCount = statusReportData.filter(p => p.status === "paid").length
    const pendingCount = statusReportData.filter(p => p.status === "pending").length

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Status Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.4; margin: 10px; }
            .print-header {
              text-align: center;
              border-bottom: 3px solid #000;
              margin-bottom: 15px;
              padding-bottom: 10px;
            }
            .print-header h1 { font-size: 18px; font-weight: bold; margin: 0; }
            .print-header h2 { font-size: 14px; font-weight: bold; color: #555; margin: 5px 0 0 0; }
            .print-header p { font-size: 11px; color: #666; margin: 3px 0; }
            .report-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              font-size: 11px;
            }
            .report-info div { padding: 5px; background: #f5f5f5; flex: 1; margin-right: 10px; }
            .report-info div:last-child { margin-right: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table thead { background: #3d3d3d; color: white; }
            table th, table td { border: 1px solid #999; padding: 6px; font-size: 10px; }
            table th { font-weight: bold; text-align: left; }
            table tbody tr:nth-child(even) { background: #f9f9f9; }
            table tbody tr:nth-child(odd) { background: #fff; }
            .summary {
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 15px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 11px;
              font-weight: bold;
            }
            .footer {
              margin-top: 20px;
              border-top: 1px solid #ccc;
              padding-top: 8px;
              text-align: center;
              font-size: 9px;
              color: #888;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${settings?.trustName || "Waqf Trust"}</h1>
            <h2>Payment Status Report</h2>
            <p>${new Date().toLocaleString()}</p>
          </div>

          <div class="report-info">
            <div><strong>Report Type:</strong> ${statusReportShowPending && !statusReportShowPaid ? "Pending Payments Only" : statusReportShowPaid && !statusReportShowPending ? "Paid Payments Only" : "All Payments"}</div>
            <div><strong>Total Records:</strong> ${statusReportData.length}</div>
            <div><strong>Total Amount:</strong> ${formatPKR(totalAmount)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Donor ID</th>
                <th>Donor Name</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span>Total Paid:</span> <span style="color: green;">${paidCount} record(s) - ${formatPKR(statusReportData.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0))}</span></div>
            <div class="summary-row"><span>Total Pending:</span> <span style="color: orange;">${pendingCount} record(s) - ${formatPKR(statusReportData.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount || 0), 0))}</span></div>
            <div class="summary-row" style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 8px;"><span>TOTAL:</span> <span>${statusReportData.length} record(s) - ${formatPKR(totalAmount)}</span></div>
          </div>

          <div class="footer">
            <p style="margin-bottom: 3px;">Generated by Wasi Foundation Management System</p>
            <p>© 2026 - All Rights Reserved</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-muted-foreground">Select a donor and date range, then generate the report on screen.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Report</CardTitle>
          <CardDescription>Choose a donor and date range to preview payments below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-medium">Donor</p>
              <Select value={selectedDonorId} onValueChange={setSelectedDonorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={donorsLoading ? "Loading donors..." : "Select donor"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Donors</SelectItem>
                  {donors.map((donor) => (
                    <SelectItem key={donor._id} value={donor._id}>
                      {donor.donorId} - {donor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">From Date</p>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">To Date</p>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={loadReport} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Show Report"}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={payments.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={payments.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Donor Directory Report</CardTitle>
          <CardDescription>View all donors in a clean list and print the complete donor directory.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Donors</p>
                <p className="text-xl font-semibold">{donorDirectory.length}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handlePrintDonorDirectory} disabled={donorDirectory.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print Donor List
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {donorDirectory.map((donor, index) => (
              <div key={donor._id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">S.No {index + 1}</p>
                    <p className="font-semibold">{donor.name}</p>
                    <p className="text-xs text-muted-foreground">{donor.donorId}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-primary">{formatPKR(Number(donor.monthlyAmount || 1000))}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Payments Found</p>
            <p className="text-2xl font-semibold">{summary.totalRows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-semibold text-primary">{formatPKR(summary.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Donors in Result</p>
            <p className="text-2xl font-semibold">{summary.donorsInReport}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Last Generated</p>
            <p className="text-sm font-medium">{lastGeneratedAt || "Not generated yet"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Report Output</CardTitle>
            <CardDescription>
              {selectedDonor
                ? `${selectedDonor.name} (${selectedDonor.donorId})`
                : "All donors within the selected date range."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No records found for the selected donor and date range.
              </div>
            ) : (
              <div className="space-y-3 md:hidden">
                {payments.map((payment) => (
                  <div key={payment._id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{formatDate(payment.paymentDate)}</p>
                      <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium">{payment.donor.name}</p>
                    <p className="text-xs text-muted-foreground">{payment.donor.donorId}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{monthName(payment.month)} {payment.year} • {payment.method}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">{formatPKR(payment.amount)}</p>
                  </div>
                ))}
              </div>
            )}

            {payments.length > 0 ? (
              <div className="hidden overflow-x-auto rounded-md border md:block">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Donor</th>
                      <th className="px-3 py-2 text-left font-medium">Month</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment._id} className="border-t">
                        <td className="px-3 py-2">{formatDate(payment.paymentDate)}</td>
                        <td className="px-3 py-2">
                          <div>
                            <p className="font-medium">{payment.donor.name}</p>
                            <p className="text-xs text-muted-foreground">{payment.donor.donorId}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2">{monthName(payment.month)} {payment.year}</td>
                        <td className="px-3 py-2">
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">{formatPKR(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Summary Breakdown</CardTitle>
            <CardDescription>Donation totals grouped by donor for the current result set.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {donorBreakdown.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Generate a report to see summary breakdown.
              </div>
            ) : (
              donorBreakdown.map((item) => {
                const rate = summary.totalAmount > 0 ? (item.amount / summary.totalAmount) * 100 : 0
                return (
                  <div key={item.donorId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.donorName}</p>
                        <p className="text-xs text-muted-foreground">{item.donorId}</p>
                      </div>
                      <Badge variant="secondary">{item.count} entries</Badge>
                    </div>
                    <p className="mt-2 font-medium text-primary">{formatPKR(item.amount)}</p>
                    <div className="mt-2">
                      <Progress value={Math.min(100, rate)} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generated Report Note</CardTitle>
          <CardDescription>Use the button above to regenerate the on-screen report for a different donor or date range.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            The report shown above is generated directly from the selected donor and date filters.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payments Details</CardTitle>
          <CardDescription>View all months of a year with payment records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentsDetailError ? <p className="text-sm text-destructive">{paymentsDetailError}</p> : null}

          <div className="mb-4">
            <p className="mb-2 text-sm font-medium">Select Year</p>
            <Select value={paymentsDetailYear} onValueChange={setPaymentsDetailYear}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i
                  return (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {paymentsDetailLoading ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Loading payments for {paymentsDetailYear}...
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="space-y-4 md:hidden">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const payments = monthlyPayments[month] || []
                  const monthStr = monthName(month)
                  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

                  return (
                    <div key={month} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="font-semibold">{monthStr} {paymentsDetailYear}</p>
                          <p className="text-xs text-muted-foreground">{payments.length} payment(s)</p>
                        </div>
                        <p className="text-sm font-semibold text-primary">{formatPKR(totalAmount)}</p>
                      </div>
                      {payments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No payments recorded</p>
                      ) : (
                        <div className="space-y-2">
                          {payments.map((payment) => (
                            <div key={payment._id} className="rounded-md border border-dashed border-muted-foreground/30 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium">{payment.donor.name}</p>
                                <Badge variant={payment.status === "paid" ? "default" : "secondary"} className="text-xs">
                                  {payment.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{payment.donor.donorId}</p>
                              <div className="mt-1 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{payment.method}</p>
                                <p className="text-xs font-semibold text-primary">{formatPKR(payment.amount)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop View */}
              <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const payments = monthlyPayments[month] || []
                  const monthStr = monthName(month)
                  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

                  return (
                    <div key={month} className="rounded-lg border p-4">
                      <div className="mb-3 border-b pb-3">
                        <p className="font-semibold text-sm">{monthStr}</p>
                        <p className="text-xs text-muted-foreground">{payments.length} payment(s)</p>
                        <p className="mt-2 text-sm font-semibold text-primary">{formatPKR(totalAmount)}</p>
                      </div>
                      {payments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No payments</p>
                      ) : (
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                          {payments.map((payment) => (
                            <div key={payment._id} className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-2">
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{payment.donor.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{payment.donor.donorId}</p>
                                </div>
                                <Badge variant={payment.status === "paid" ? "default" : "secondary"} className="shrink-0 text-xs">
                                  {payment.status === "paid" ? "✓" : payment.status === "pending" ? "⏳" : "✗"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{payment.method}</p>
                              <p className="text-xs font-semibold text-primary">{formatPKR(payment.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Status Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Status Report (Paid/Pending)</CardTitle>
          <CardDescription>Filter by date range or month, and check status to generate printable report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusReportError ? <p className="text-sm text-destructive">{statusReportError}</p> : null}

          <div className="space-y-3">
            <div>
              <p className="mb-3 text-sm font-medium">Filter Type: Date Range</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">From Date (Optional)</label>
                  <Input
                    type="date"
                    value={statusReportFromDate}
                    onChange={(e) => setStatusReportFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">To Date (Optional)</label>
                  <Input
                    type="date"
                    value={statusReportToDate}
                    onChange={(e) => setStatusReportToDate(e.target.value)}
                  />
                </div>
                {statusReportFromDate || statusReportToDate ? null : (
                  <div>
                    <p className="text-xs font-medium mb-1">Or Select Month/Year</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={statusReportMonth} onValueChange={setStatusReportMonth}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {new Intl.DateTimeFormat("en", { month: "short" }).format(
                                new Date(2026, m - 1, 1)
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={statusReportYear} onValueChange={setStatusReportYear}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="mb-3 text-sm font-medium">Payment Status Filter</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusReportShowPaid}
                    onChange={(e) => setStatusReportShowPaid(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">✓ Show Paid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusReportShowPending}
                    onChange={(e) => setStatusReportShowPending(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">⏳ Show Pending</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={loadStatusReport} disabled={statusReportLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {statusReportLoading ? "Loading..." : "Generate Report"}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrintStatusReport}
              disabled={statusReportData.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>

          {statusReportData.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded bg-blue-50 p-2">
                  <p className="text-xs text-muted-foreground">Total Records</p>
                  <p className="text-lg font-bold">{statusReportData.length}</p>
                </div>
                <div className="rounded bg-green-50 p-2">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-lg font-bold text-green-600">
                    {statusReportData.filter(p => p.status === "paid").length}
                  </p>
                </div>
                <div className="rounded bg-orange-50 p-2">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-orange-600">
                    {statusReportData.filter(p => p.status === "pending").length}
                  </p>
                </div>
                <div className="rounded bg-purple-50 p-2">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-sm font-bold text-purple-600">
                    {formatPKR(statusReportData.reduce((sum, p) => sum + Number(p.amount || 0), 0))}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left p-2 text-xs">Donor ID</th>
                      <th className="text-left p-2 text-xs">Name</th>
                      <th className="text-center p-2 text-xs">Period</th>
                      <th className="text-right p-2 text-xs">Amount</th>
                      <th className="text-center p-2 text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusReportData.map((row, idx) => (
                      <tr key={row._id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="p-2 text-xs">{row.donor.donorId}</td>
                        <td className="p-2 text-xs">{row.donor.name}</td>
                        <td className="text-center p-2 text-xs">{row.month}/{row.year}</td>
                        <td className="text-right p-2 text-xs font-medium">{formatPKR(row.amount)}</td>
                        <td className="text-center p-2">
                          <Badge
                            variant={row.status === "paid" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {row.status === "paid" ? "✓ Paid" : "⏳ Pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
