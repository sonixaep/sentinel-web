/* app/targets/[userId]/layout.tsx */
"use client"

import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSentinel } from "@/lib/context"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  LayoutDashboard,
  Clock,
  BarChart3,
  MessageSquare,
  Brain,
  Bell,
  User,
  Pencil,
  Check,
  X,
} from "lucide-react"

const tabs = [
  { name: "Overview",  href: "",           icon: LayoutDashboard },
  { name: "Timeline",  href: "/timeline",  icon: Clock },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Messages",  href: "/messages",  icon: MessageSquare },
  { name: "Insights",  href: "/insights",  icon: Brain },
  { name: "Alerts",    href: "/alerts",    icon: Bell },
  { name: "Profile",   href: "/profile",   icon: User },
]

export default function TargetLayout({ children }: { children: React.ReactNode }) {
  const params   = useParams()
  const pathname = usePathname()
  const userId   = params.userId as string
  const { targetStatuses, targets, refreshTargets } = useSentinel()

  const status       = targetStatuses[userId]
  const target       = targets.find((t) => t.user_id === userId)
  const presence     = status?.presence
  const currentStatus = presence?.status || "offline"
  const basePath     = `/targets/${userId}`

  // Label editing state
  const [editingLabel,  setEditingLabel]  = useState(false)
  const [labelValue,    setLabelValue]    = useState(target?.label || "")
  const [labelHovered,  setLabelHovered]  = useState(false)
  const [savingLabel,   setSavingLabel]   = useState(false)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // Sync label value when target loads/changes
  useEffect(() => {
    if (!editingLabel) {
      setLabelValue(target?.label || "")
    }
  }, [target?.label, editingLabel])

  // Focus input when editing starts
  useEffect(() => {
    if (editingLabel) {
      labelInputRef.current?.focus()
      labelInputRef.current?.select()
    }
  }, [editingLabel])

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLabelValue(target?.label || "")
    setEditingLabel(true)
  }

  const handleLabelSave = async () => {
    if (savingLabel) return
    setSavingLabel(true)
    try {
      const trimmed = labelValue.trim()
      await api.updateTarget(userId, { label: trimmed || undefined })
      await refreshTargets()
    } catch (e) {
      console.error("Failed to update label:", e)
    } finally {
      setSavingLabel(false)
      setEditingLabel(false)
    }
  }

  const handleLabelCancel = () => {
    setLabelValue(target?.label || "")
    setEditingLabel(false)
  }

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")  { e.preventDefault(); handleLabelSave() }
    if (e.key === "Escape") { e.preventDefault(); handleLabelCancel() }
  }

  const getCurrentTab = () => pathname.replace(basePath, "") || ""

  const statusColor =
    currentStatus === "online"  ? "var(--color-status-online)"  :
    currentStatus === "idle"    ? "var(--color-status-idle)"    :
    currentStatus === "dnd"     ? "var(--color-status-dnd)"     :
                                  "var(--color-status-offline)"

  const displayName =
    status?.profile?.global_name ||
    status?.profile?.username ||
    `…${userId.slice(-8)}`

  return (
    <AppShell>
      {/* ── Profile header ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b bg-background">
        {/* Top row */}
        <div className="flex items-center gap-3 px-3 py-3 md:px-6">
          <Link href="/targets" className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:h-8 md:w-8"
              aria-label="Back to targets"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <Avatar
            userId={userId}
            avatarHash={status?.profile?.avatar_hash}
            size={40}
            status={currentStatus as "online" | "idle" | "dnd" | "offline"}
          />

          <div className="flex-1 min-w-0">
            {/* Name row with label editor */}
            <div
              className="flex items-center gap-2 flex-wrap"
              onMouseEnter={() => setLabelHovered(true)}
              onMouseLeave={() => setLabelHovered(false)}
            >
              <h1 className="truncate text-sm font-semibold md:text-base">
                {displayName}
              </h1>

              {editingLabel ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={labelInputRef}
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onKeyDown={handleLabelKeyDown}
                    placeholder="Add label…"
                    className="h-5 rounded px-1.5 text-[10px] font-semibold border border-primary bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ maxWidth: 110 }}
                    disabled={savingLabel}
                  />
                  <button
                    onClick={handleLabelSave}
                    disabled={savingLabel}
                    className="rounded p-0.5 text-status-online hover:bg-secondary transition-colors disabled:opacity-50"
                    title="Save"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleLabelCancel}
                    className="rounded p-0.5 text-muted-foreground hover:bg-secondary transition-colors"
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {target?.label && (
                    <Badge variant="default">{target.label}</Badge>
                  )}
                  <button
                    onClick={startEditing}
                    className={cn(
                      "rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all",
                      labelHovered ? "opacity-100" : "opacity-0"
                    )}
                    title={target?.label ? "Edit label" : "Add label"}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}

              {target?.priority !== undefined && target.priority >= 2 && (
                <Badge variant="destructive">Critical</Badge>
              )}
            </div>

            {/* Status row */}
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: statusColor }}
              />
              <p className="font-mono text-[10px] text-muted-foreground truncate">
                <span className="capitalize hidden sm:inline">{currentStatus} · </span>
                {userId}
              </p>
            </div>
          </div>
        </div>

        {/* ── Horizontally scrollable tab bar ── */}
        <div
          className="flex overflow-x-auto px-2 md:px-4 scrollbar-none"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {tabs.map((tab) => {
            const isActive = getCurrentTab() === tab.href
            return (
              <Link
                key={tab.name}
                href={`${basePath}${tab.href}`}
                className={cn(
                  "relative flex flex-shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap",
                  "md:text-sm md:px-4",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={{ minHeight: 44 }}
              >
                <tab.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>{tab.name}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="p-3 md:p-6">{children}</div>
    </AppShell>
  )
}