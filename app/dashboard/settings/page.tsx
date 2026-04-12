"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { useAuth } from "@/lib/auth-context"

type SettingsData = {
  applicationName: string
  trustName: string
  tagline?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  ownerName?: string
  ownerPhone?: string
  registrationNumber?: string
  establishedYear?: number
  monthlyTarget: number
}

const emptySettings: SettingsData = {
  applicationName: "WASI TRUST MANGMENT SYSTEM",
  trustName: "WASI TRUST MANGMENT SYSTEM",
  tagline: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  ownerName: "",
  ownerPhone: "",
  registrationNumber: "",
  establishedYear: undefined,
  monthlyTarget: 1000,
}

export default function SettingsPage() {
  const { user, isLoading } = useAuth()
  const [settings, setSettings] = useState<SettingsData>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/settings")
        const data = await res.json()

        if (!res.ok) {
          setError(data?.error || "Failed to load settings")
          return
        }

        setSettings({
          ...emptySettings,
          ...(data.settings || {}),
        })
        setError("")
      } catch {
        setError("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  if (isLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading settings...</div>
  }

  if (user?.role !== "Admin") {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">Only Admin can update foundation settings.</p>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          establishedYear: settings.establishedYear ? Number(settings.establishedYear) : undefined,
          monthlyTarget: Number(settings.monthlyTarget || 1000),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Failed to update settings")
        return
      }

      setSettings({ ...emptySettings, ...(data.settings || {}) })
      setSuccess("Settings updated successfully")
    } catch {
      setError("Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Update trust and software branding for multi-trust usage.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-primary">{success}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Foundation Profile</CardTitle>
          <CardDescription>These values are used in app branding and trust information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="applicationName">Application Name</FieldLabel>
                <Input
                  id="applicationName"
                  value={settings.applicationName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, applicationName: e.target.value }))}
                  placeholder="WASI TRUST MANGMENT SYSTEM"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="trustName">Foundation Name</FieldLabel>
                <Input
                  id="trustName"
                  value={settings.trustName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, trustName: e.target.value }))}
                  placeholder="WASI TRUST MANGMENT SYSTEM"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
                <Input
                  id="tagline"
                  value={settings.tagline || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, tagline: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  value={settings.phone || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input
                  id="address"
                  value={settings.address || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input
                  id="city"
                  value={settings.city || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, city: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ownerName">Owner / Manager Name</FieldLabel>
                <Input
                  id="ownerName"
                  value={settings.ownerName || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, ownerName: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ownerPhone">Owner / Manager Phone</FieldLabel>
                <Input
                  id="ownerPhone"
                  value={settings.ownerPhone || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, ownerPhone: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="registrationNumber">Registration Number</FieldLabel>
                <Input
                  id="registrationNumber"
                  value={settings.registrationNumber || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, registrationNumber: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="establishedYear">Established Year</FieldLabel>
                <Input
                  id="establishedYear"
                  type="number"
                  value={settings.establishedYear || ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, establishedYear: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="monthlyTarget">Default Monthly Target</FieldLabel>
                <Input
                  id="monthlyTarget"
                  type="number"
                  min={1}
                  value={settings.monthlyTarget}
                  onChange={(e) => setSettings((prev) => ({ ...prev, monthlyTarget: Number(e.target.value || 1000) }))}
                />
              </Field>
              <div className="pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
