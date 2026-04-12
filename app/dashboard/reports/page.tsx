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
import { Badge } from "@/components/ui/badge"

const reportTypes = [
  {
    id: "annual",
    name: "Annual Report",
    description: "Comprehensive yearly overview of all Waqf properties, income, and beneficiary distributions.",
    icon: FileText,
  },
  {
    id: "valuation",
    name: "Property Valuation Report",
    description: "Detailed valuation assessment of all registered Waqf properties.",
    icon: FileText,
  },
  {
    id: "beneficiary",
    name: "Beneficiary Distribution Report",
    description: "Summary of all disbursements made to beneficiaries during the selected period.",
    icon: FileText,
  },
  {
    id: "transaction",
    name: "Transaction Summary Report",
    description: "Complete listing of all financial transactions including income and expenses.",
    icon: FileText,
  },
]

const recentReports = [
  { id: 1, name: "Annual Report 2024", type: "Annual Report", generatedAt: "2024-12-01", format: "PDF", size: "2.4 MB" },
  { id: 2, name: "Q3 Beneficiary Distribution", type: "Beneficiary Distribution", generatedAt: "2024-10-15", format: "Excel", size: "1.2 MB" },
  { id: 3, name: "Property Valuation Oct 2024", type: "Property Valuation", generatedAt: "2024-10-01", format: "PDF", size: "3.8 MB" },
  { id: 4, name: "H1 Transaction Summary", type: "Transaction Summary", generatedAt: "2024-07-01", format: "CSV", size: "856 KB" },
]

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async (format: string) => {
    setIsGenerating(true)
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsGenerating(false)
    console.log("[v0] Generating report:", { type: selectedReport, format, startDate, endDate })
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
          <CardDescription>Download previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{report.type}</span>
                      <span>•</span>
                      <span>{report.generatedAt}</span>
                      <span>•</span>
                      <span>{report.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{report.format}</Badge>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
