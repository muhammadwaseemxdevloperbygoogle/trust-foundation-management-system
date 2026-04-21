"use client"

import { useEffect, useState } from "react"

type AppSettings = {
  applicationName?: string
  trustName?: string
  tagline?: string
}

let settingsCache: AppSettings | null = null
let settingsPromise: Promise<AppSettings | null> | null = null

async function fetchAppSettings(): Promise<AppSettings | null> {
  if (settingsCache) return settingsCache
  if (!settingsPromise) {
    settingsPromise = fetch("/api/settings")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) return null
        return (data?.settings ?? data) as AppSettings
      })
      .catch(() => null)
      .finally(() => {
        settingsPromise = null
      })
  }

  const result = await settingsPromise
  settingsCache = result
  return result
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const data = await fetchAppSettings()
        if (!mounted) return
        setSettings(data)
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
  const tagline = settings?.tagline || ""

  return { settings, applicationName, trustName, tagline }
}
