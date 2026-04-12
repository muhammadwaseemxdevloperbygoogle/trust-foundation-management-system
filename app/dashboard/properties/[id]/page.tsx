"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Calendar, FileText, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, hasPermission } from "@/lib/auth-context"
import { formatPKR } from "@/src/lib/waqf-utils"

type PropertyDetails = {
  _id: string
  propertyId: string
  name: string
  type: "Land" | "Building" | "Agricultural"
  location: string
  status: "Active" | "Inactive"
  annualValue: number
  deedNumber?: string
  dateRegistered?: string
  area?: string
  description?: string
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const canEdit = hasPermission(user?.role, "edit")
  const [property, setProperty] = useState<PropertyDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/properties/${id}`)
      const data = await res.json()
      setProperty(data.property || null)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">Property not found</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/properties">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Link>
      </Button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight">{property.name}</h1>
                  <Badge variant={property.status === "Active" ? "default" : "secondary"}>{property.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{property.location}</span>
                  <span className="flex items-center gap-1"><FileText className="h-4 w-4" />{property.deedNumber || "N/A"}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Registered: {property.dateRegistered ? new Date(property.dateRegistered).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            </div>
            {canEdit ? <Button disabled>Edit Property</Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Property Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Property ID</p><p className="font-medium">{property.propertyId}</p></div>
            <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{property.type}</p></div>
            <div><p className="text-sm text-muted-foreground">Area</p><p className="font-medium">{property.area || "N/A"}</p></div>
            <div><p className="text-sm text-muted-foreground">Annual Value</p><p className="font-medium text-primary">{formatPKR(property.annualValue)}</p></div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-sm mt-1">{property.description || "No description provided."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

