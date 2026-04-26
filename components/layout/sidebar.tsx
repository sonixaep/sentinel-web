/* components/layout/sidebar.tsx */
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSentinel } from "@/lib/context"
import {
  LayoutDashboard,
  Users,
  Bell,
  Settings,
  Activity,
  Shield,
  BookOpen,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/",         icon: LayoutDashboard },
  { name: "Targets",   href: "/targets",  icon: Users },
  { name: "Alerts",    href: "/alerts",   icon: Bell },
  { name: "Settings",  href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname  = usePathname()
  const { connected, status } = useSentinel()

  const isSetupPage = pathname === "/setup"

  return (
    <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-60 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Sentinel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="my-2 border-t border-border" />

        {/* Setup guide link */}
        <Link
          href="/setup"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isSetupPage
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Setup Guide
          {!connected && (
            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
              !
            </span>
          )}
        </Link>
      </nav>

      {/* Status footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              connected ? "bg-status-online animate-pulse-dot" : "bg-status-offline"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {connected ? "Connected" : "Disconnected"}
            </p>
            {status ? (
              <p className="text-[10px] text-muted-foreground truncate">
                {status.activeTargets} targets · {status.uptimeFormatted}
              </p>
            ) : (
              <Link
                href="/setup"
                className="text-[10px] text-primary hover:underline"
              >
                Run setup guide →
              </Link>
            )}
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </aside>
  )
}