"use client"

import { Building2, Users, DollarSign, Clock, Plus, FileText, MapPin } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth, hasPermission } from "@/lib/auth-context"
import Link from "next/link"

const recentActivity = [
  {
    id: 1,
    action: "Property Added",
    description: "Al-Noor Mosque property registered",
    user: "Ahmed Hassan",
    time: "5 minutes ago",
    type: "create",
  },
  {
    id: 2,
    action: "Document Uploaded",
    description: "Deed document for Property #1023",
    user: "Fatima Ali",
    time: "1 hour ago",
    type: "upload",
  },
  {
    id: 3,
    action: "Beneficiary Updated",
    description: "Payment status changed for Omar Foundation",
    user: "Sara Mohammed",
    time: "2 hours ago",
    type: "update",
  },
  {
    id: 4,
    action: "Report Generated",
    description: "Q4 2024 Annual Report exported",
    user: "Ahmed Hassan",
    time: "3 hours ago",
    type: "report",
  },
  {
    id: 5,
    action: "Property Edited",
    description: "Valuation updated for Green Valley Land",
    user: "Fatima Ali",
    time: "5 hours ago",
    type: "update",
  },
]

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Properties"
          value="156"
          icon={Building2}
          trend={{ value: 12, label: "vs last month" }}
        />
        <StatCard
          title="Total Beneficiaries"
          value="2,847"
          icon={Users}
          trend={{ value: 8, label: "vs last month" }}
        />
        <StatCard
          title="Monthly Income"
          value="$847,250"
          icon={DollarSign}
          trend={{ value: -3, label: "vs last month" }}
        />
        <StatCard
          title="Pending Actions"
          value="23"
          icon={Clock}
          trend={{ value: 0, label: "no change" }}
        />
      </div>

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
                    <Link href="/dashboard/beneficiaries">
                      <Users className="mr-2 h-4 w-4" />
                      Add Beneficiary
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
                    <p className="text-sm text-muted-foreground">Interactive map placeholder</p>
                    <p className="text-xs text-muted-foreground/70">156 properties across 12 regions</p>
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
            <CardDescription>Latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentActivity.map((activity) => (
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
              ))}
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
