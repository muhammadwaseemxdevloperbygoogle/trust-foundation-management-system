"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth, hasPermission } from "@/lib/auth-context"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "view" as const,
  },
  {
    name: "Properties",
    href: "/dashboard/properties",
    icon: Building2,
    permission: "view" as const,
  },
  {
    name: "Beneficiaries",
    href: "/dashboard/beneficiaries",
    icon: Users,
    permission: "view" as const,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    permission: "view" as const,
  },
  {
    name: "User Management",
    href: "/dashboard/users",
    icon: UserCog,
    permission: "view" as const,
    adminOnly: true,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const filteredNavigation = navigation.filter((item) => {
    if (item.adminOnly && user?.role !== "Admin") return false
    return hasPermission(user?.role, item.permission)
  })

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 relative",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Islamic pattern overlay */}
        <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />

        {/* Header */}
        <div className={cn("relative z-10 flex items-center gap-3 p-4 border-b border-sidebar-border", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg shrink-0">
            W
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">Waqf Trust</span>
              <span className="text-xs text-sidebar-foreground/70">Foundation</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 p-3 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.name}>{linkContent}</div>
          })}
        </nav>

        {/* User section & Logout */}
        <div className="relative z-10 p-3 border-t border-sidebar-border">
          {user && !collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
              </div>
            </div>
          )}
          
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="w-full text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground">
                Sign out
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full justify-start gap-3 px-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </Button>
          )}
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </aside>
    </TooltipProvider>
  )
}
