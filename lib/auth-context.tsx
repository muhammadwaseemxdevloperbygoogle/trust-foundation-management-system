"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export type UserRole = "Admin" | "Trustee" | "Auditor" | "Viewer"

export interface User {
  id: string
  username: string
  name: string
  email?: string
  role: UserRole
  groups?: string[]
  rights?: string[]
  status?: "Active" | "Inactive"
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "waqf_auth_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsedUser = JSON.parse(stored) as User
        setUser(parsedUser)
      }
    } catch (e) {
      // Invalid stored data, clear it
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      return false
    }

    const data = await res.json()
    if (!data?.user) {
      return false
    }

    setUser(data.user)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user))
    return true
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Helper to check if user has permission for certain actions
export function hasPermission(role: UserRole | undefined, action: "create" | "edit" | "delete" | "view"): boolean {
  if (!role) return false
  
  const permissions: Record<UserRole, string[]> = {
    Admin: ["create", "edit", "delete", "view"],
    Trustee: ["create", "edit", "view"],
    Auditor: ["view"],
    Viewer: ["view"],
  }
  
  return permissions[role]?.includes(action) ?? false
}
