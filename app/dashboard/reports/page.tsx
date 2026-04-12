"use client"

import { useState } from "react"
import { FileText, Download, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const reportTypes = [
  {
    id: "ledger",
    name: "Donor Ledger Report",
    description: "Month-by-month paid and pending status based on recorded donor payments.",
    icon: FileText,
  },
]

function toCsv(rows: Array<{ donorId: string; donorName: string; year: number; month: number; status: string; amount: number }>) {
  const header = "donorId,donorName,year,month,status,amount"
  const body = rows.map((row) => {
    const donorName = `"${row.donorName.replace(/"/g, '""')}"`
    return [row.donorId, donorName, row.year, row.month, row.status, row.amount].join(",")
  })
  return [header, ...body].join("\n")
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

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string>("")
  const [lastRowCount, setLastRowCount] = useState(0)

  const handleGenerate = async (format: string) => {
    if (!selectedReport) {
      setError("Please select a report type")
      return
    }

    setError("")
    setSuccess("")
    setIsGenerating(true)

    try {
      const effectiveYear = startDate ? Number(startDate.slice(0, 4)) : new Date().getFullYear()
      const res = await fetch(`/api/reports/ledger?year=${effectiveYear}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Failed to generate report")
        return
      }

      const flatRows: Array<{ donorId: string; donorName: string; year: number; month: number; status: string; amount: number }> = []
      for (const donorReport of data.report || []) {
        const donorId = donorReport?.donor?.donorId || ""
        const donorName = donorReport?.donor?.name || ""
        for (const monthRow of donorReport?.months || []) {
          flatRows.push({
            donorId,
            donorName,
            year: donorReport.year,
            month: monthRow.month,
            status: monthRow.status,
            amount: monthRow.amount,
          })
        }
      }

      setLastRowCount(flatRows.length)
      setLastGeneratedAt(new Date().toLocaleString())

      if (format === "csv" || format === "excel") {
        const csv = toCsv(flatRows)
        downloadFile(csv, `ledger-${effectiveYear}.csv`, "text/csv;charset=utf-8")
        setSuccess(`Generated ${flatRows.length} rows and downloaded CSV file.`)
        return
      }

      if (format === "pdf") {
        setSuccess(`Report generated with ${flatRows.length} rows. PDF export is not connected yet.`)
      }
    } catch {
      setError("Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download comprehensive reports for Waqf management.
        </p>
      </div>

      {/* Report generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Report</CardTitle>
          <CardDescription>Select a report type and date range to generate</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {success ? <p className="mb-3 text-sm text-primary">{success}</p> : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="report-type">Report Type</FieldLabel>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedReport && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  {reportTypes.find((r) => r.id === selectedReport)?.description}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="start-date">Start Date</FieldLabel>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="end-date">End Date</FieldLabel>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </Field>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => handleGenerate("pdf")}
                disabled={!selectedReport || isGenerating}
              >
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "Export PDF"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerate("excel")}
                disabled={!selectedReport || isGenerating}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerate("csv")}
                disabled={!selectedReport || isGenerating}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Report types overview */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Report Types</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <Card
                key={report.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${
                  selectedReport === report.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{report.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recently Generated Reports</CardTitle>
          <CardDescription>Latest generated report metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          {lastGeneratedAt ? (
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium">Last generated: {lastGeneratedAt}</p>
              <p className="mt-1 text-sm text-muted-foreground">Rows included: {lastRowCount}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">No generated reports yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
