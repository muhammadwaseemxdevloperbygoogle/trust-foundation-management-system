"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Eye, Filter } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, hasPermission } from "@/lib/auth-context"
import { formatPKR } from "@/src/lib/waqf-utils"

type PropertyItem = {
  _id: string
  propertyId: string
  name: string
  type: "Land" | "Building" | "Agricultural"
  location: string
  status: "Active" | "Inactive"
  annualValue: number
}

export default function PropertiesPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user?.role, "create")
  const canEdit = hasPermission(user?.role, "edit")

  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState("")

  const loadProperties = async () => {
    const params = new URLSearchParams({ search, type: typeFilter, status: statusFilter })
    const res = await fetch(`/api/properties?${params.toString()}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || "Failed to fetch properties")
      return
    }
    setProperties(data.properties || [])
  }

  useEffect(() => {
    loadProperties()
  }, [search, typeFilter, statusFilter])

  const filteredProperties = useMemo(() => properties, [properties])

  const getStatusBadgeVariant = (status: string) => {
    return status === "Active" ? "default" : "secondary"
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "Building":
        return "default"
      case "Land":
        return "secondary"
      case "Agricultural":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Properties</h1>
          <p className="text-muted-foreground">Manage and view all Waqf properties in the database.</p>
        </div>
        {canCreate && <Button disabled>Add Property</Button>}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Search by name, ID, or location..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Building">Building</SelectItem>
                <SelectItem value="Land">Land</SelectItem>
                <SelectItem value="Agricultural">Agricultural</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Property List</CardTitle>
          <CardDescription>{filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"} found</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Annual Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No properties found.</TableCell></TableRow>
                ) : (
                  filteredProperties.map((property) => (
                    <TableRow key={property._id}>
                      <TableCell className="font-medium">{property.propertyId}</TableCell>
                      <TableCell>
                        <Link href={`/dashboard/properties/${property.propertyId}`} className="hover:text-primary hover:underline">{property.name}</Link>
                      </TableCell>
                      <TableCell><Badge variant={getTypeBadgeVariant(property.type)}>{property.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{property.location}</TableCell>
                      <TableCell><Badge variant={getStatusBadgeVariant(property.status)}>{property.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatPKR(property.annualValue)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Actions</Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/properties/${property.propertyId}`}>
                                <Eye className="mr-2 h-4 w-4" />View Details
                              </Link>
                            </DropdownMenuItem>
                            {canEdit ? <DropdownMenuItem disabled>Edit</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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

