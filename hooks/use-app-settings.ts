"use client"

import { useEffect, useState } from "react"

type AppSettings = {
  applicationName?: string
  trustName?: string
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (!mounted || !res.ok) return
        setSettings(data.settings || null)
      } catch {
        if (!mounted) return
        setSettings(null)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  const applicationName = settings?.applicationName || "WASI TRUST MANGMENT SYSTEM"
  const trustName = settings?.trustName || applicationName

  return { settings, applicationName, trustName }
}
