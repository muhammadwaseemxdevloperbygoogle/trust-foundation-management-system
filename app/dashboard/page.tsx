"use client"

import { useEffect, useState } from "react"
import { Building2, Users, DollarSign, Clock, Plus, FileText, MapPin } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth, hasPermission } from "@/lib/auth-context"
import { formatPKR } from "@/src/lib/waqf-utils"
import Link from "next/link"

const getActivityBadgeVariant = (type: string) => {
  switch (type) {
    case "create":
      return "default"
    case "upload":
      return "secondary"
    case "update":
      return "outline"
    case "report":
      return "secondary"
    default:
      return "outline"
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user?.role, "create")
  const [stats, setStats] = useState<{
    totalDonors: number
    activeDonors: number
    inactiveDonors: number
    currentMonthCollected: number
    currentMonthPending: number
    currentMonthTarget: number
    yearToDateCollected: number
    yearToDateExpenditure: number
    yearToDateReceived: number
    openingBalanceCurrentMonth: number
    closingBalanceCurrentMonth: number
    balance: number
    recentPayments: Array<{
      _id: string
      paymentId: string
      amount: number
      paymentDate: string
      method: string
      donor?: { donorId?: string; name?: string } | string
    }>
    recentExpenditures: Array<{
      _id: string
      expenditureId: string
      title: string
      amount: number
      date: string
      category: string
    }>
  } | null>(null)
  const [propertyCount, setPropertyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        const [statsRes, propertiesRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/properties"),
        ])

        const statsData = await statsRes.json()
        const propertiesData = await propertiesRes.json()

        if (!statsRes.ok) {
          setError(statsData?.error || "Failed to load dashboard stats")
        } else {
          setStats(statsData)
        }

        if (propertiesRes.ok) {
          setPropertyCount((propertiesData.properties || []).length)
        }
      } catch {
        setError("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const activityItems = [
    ...(stats?.recentPayments || []).map((payment) => ({
      id: payment._id,
      action: "Payment Recorded",
      description: `${typeof payment.donor === "string" ? payment.donor : payment.donor?.name || "Donor"} payment ${payment.paymentId}`,
      user: payment.method,
      time: new Date(payment.paymentDate).toLocaleString(),
      type: "create",
    })),
    ...(stats?.recentExpenditures || []).map((expenditure) => ({
      id: expenditure._id,
      action: "Expenditure Recorded",
      description: expenditure.title,
      user: expenditure.category,
      time: new Date(expenditure.date).toLocaleString(),
      type: "update",
    })),
  ].slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}. Here&apos;s an overview of your Waqf properties.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Properties"
          value={loading ? "..." : propertyCount}
          icon={Building2}
        />
        <StatCard
          title="Total Donors"
          value={loading ? "..." : stats?.totalDonors ?? 0}
          icon={Users}
        />
        <StatCard
          title="Monthly Income"
          value={loading ? "..." : formatPKR(stats?.currentMonthCollected ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Opening Balance"
          value={loading ? "..." : formatPKR(stats?.openingBalanceCurrentMonth ?? 0)}
          icon={Clock}
        />
        <StatCard
          title="Net Balance"
          value={loading ? "..." : formatPKR(stats?.balance ?? 0)}
          icon={Clock}
        />
        <StatCard
          title="Closing Balance"
          value={loading ? "..." : formatPKR(stats?.closingBalanceCurrentMonth ?? stats?.balance ?? 0)}
          icon={Clock}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions & Map - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          {canCreate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common tasks you can perform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/dashboard/properties/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Property
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/donors">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Donors
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/reports">
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property map placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Property Locations</CardTitle>
              <CardDescription>Geographic distribution of Waqf properties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 rounded-lg bg-muted/50 border border-border overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Map data is not connected yet</p>
                    <p className="text-xs text-muted-foreground/70">{propertyCount} properties currently loaded</p>
                  </div>
                </div>
                {/* Decorative grid pattern */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity - Takes 1 column */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest recorded payments and expenditures</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {activityItems.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </div>
              ) : (
                activityItems.map((activity) => (
                <div key={activity.id} className="px-6 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{activity.action}</p>
                        <Badge variant={getActivityBadgeVariant(activity.type)} className="text-[10px] px-1.5 py-0 shrink-0">
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {activity.user} • {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border">
              <Button variant="ghost" className="w-full text-sm" size="sm">
                View all activity
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
