"use client"

import { useEffect, useMemo, useState } from "react"
import { Mail, MoreHorizontal, UserPlus } from "lucide-react"
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useAuth } from "@/lib/auth-context"

type AppUser = {
  _id: string
  username: string
  name: string
  email?: string
  role: "Admin" | "Trustee" | "Auditor" | "Viewer"
  status: "Active" | "Inactive"
  groups?: string[]
  rights?: string[]
  lastLogin?: string
}

export default function UserManagementPage() {
  const { user, isLoading } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [error, setError] = useState("")

  const [inviteData, setInviteData] = useState({
    username: "",
    password: "",
    email: "",
    name: "",
    role: "Viewer",
    groups: "",
    rights: "",
  })

  useEffect(() => {
    if (inviteData.username.trim()) return
    const generated = inviteData.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    if (!generated) return

    setInviteData((prev) => (prev.username.trim() ? prev : { ...prev, username: generated }))
  }, [inviteData.name])

  const authHeaders = useMemo(() => ({ "x-user-role": user?.role || "" }), [user?.role])

  const loadUsers = async () => {
    if (user?.role !== "Admin") return
    const res = await fetch("/api/users", { headers: authHeaders })
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || "Failed to load users")
      return
    }
    setUsers(data.users || [])
  }

  useEffect(() => {
    loadUsers()
  }, [user?.role])

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  }

  if (user?.role !== "Admin") {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
      </div>
    )
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())

    const matchesRole = roleFilter === "all" || u.role === roleFilter
    const matchesStatus = statusFilter === "all" || u.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "default"
      case "Trustee":
        return "secondary"
      case "Auditor":
        return "outline"
      default:
        return "secondary"
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const groups = inviteData.groups.split(",").map((x) => x.trim()).filter(Boolean)
    const rights = inviteData.rights.split(",").map((x) => x.trim()).filter(Boolean)

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        username: inviteData.username,
        password: inviteData.password,
        email: inviteData.email,
        name: inviteData.name,
        role: inviteData.role,
        groups,
        rights,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || "Failed to create user")
      return
    }

    setIsInviteOpen(false)
    setInviteData({ username: "", password: "", email: "", name: "", role: "Viewer", groups: "", rights: "" })
    setError("")
    await loadUsers()
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ role: newRole }),
    })
    await loadUsers()
  }

  const toggleStatus = async (u: AppUser) => {
    await fetch(`/api/users/${u._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ status: u.status === "Active" ? "Inactive" : "Active" }),
    })
    await loadUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground">Only admin can create users and assign roles, groups, and rights.</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.length}</div><p className="text-sm text-muted-foreground">Total Users</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.filter((u) => u.status === "Active").length}</div><p className="text-sm text-muted-foreground">Active Users</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.filter((u) => u.role === "Admin").length}</div><p className="text-sm text-muted-foreground">Administrators</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.filter((u) => u.role === "Trustee").length}</div><p className="text-sm text-muted-foreground">Trustees</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Search by name, username, or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Trustee">Trustee</SelectItem>
                <SelectItem value="Auditor">Auditor</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
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
          <CardTitle className="text-base">System Users</CardTitle>
          <CardDescription>{filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"} found</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Groups / Rights</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No users found.</TableCell></TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">{u.name.charAt(0)}</div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.username}{u.email ? ` • ${u.email}` : ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={u.role} onValueChange={(value) => handleRoleChange(u._id, value)}>
                          <SelectTrigger className="w-28 h-8"><Badge variant={getRoleBadgeVariant(u.role)}>{u.role}</Badge></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Trustee">Trustee</SelectItem>
                            <SelectItem value="Auditor">Auditor</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <p>Groups: {(u.groups || []).join(", ") || "-"}</p>
                        <p>Rights: {(u.rights || []).join(", ") || "-"}</p>
                      </TableCell>
                      <TableCell><Badge variant={u.status === "Active" ? "default" : "secondary"}>{u.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem><Mail className="mr-2 h-4 w-4" />Send Email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleStatus(u)}>{u.status === "Active" ? "Deactivate User" : "Activate User"}</DropdownMenuItem>
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

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Create account and assign role, groups, and rights.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <FieldGroup>
              <Field><FieldLabel htmlFor="invite-name">Full Name</FieldLabel><Input id="invite-name" value={inviteData.name} onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="invite-username">Username</FieldLabel><Input id="invite-username" value={inviteData.username} onChange={(e) => setInviteData({ ...inviteData, username: e.target.value })} placeholder="Leave blank to auto-generate from name" /></Field>
              <Field><FieldLabel htmlFor="invite-password">Password</FieldLabel><Input id="invite-password" type="password" value={inviteData.password} onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })} required /></Field>
              <Field><FieldLabel htmlFor="invite-email">Email Address</FieldLabel><Input id="invite-email" type="email" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} /></Field>
              <Field>
                <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                <Select value={inviteData.role} onValueChange={(value) => setInviteData({ ...inviteData, role: value })}>
                  <SelectTrigger id="invite-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Trustee">Trustee</SelectItem>
                    <SelectItem value="Auditor">Auditor</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field><FieldLabel htmlFor="invite-groups">Groups (comma separated)</FieldLabel><Input id="invite-groups" value={inviteData.groups} onChange={(e) => setInviteData({ ...inviteData, groups: e.target.value })} /></Field>
              <Field><FieldLabel htmlFor="invite-rights">Rights (comma separated)</FieldLabel><Input id="invite-rights" value={inviteData.rights} onChange={(e) => setInviteData({ ...inviteData, rights: e.target.value })} /></Field>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1"><Mail className="mr-2 h-4 w-4" />Create User</Button>
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

