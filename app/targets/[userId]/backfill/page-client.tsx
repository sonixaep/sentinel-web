/* app/targets/[userId]/backfill/page.tsx */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { useApi, useTargetUserId } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatDateTime } from "@/lib/utils"
import { Download, Play, RotateCcw, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, PlusCircle } from "lucide-react"
import type { BackfillChannelRow } from "@/lib/types"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed:   { label: "Done",        color: "var(--color-status-online)",  icon: CheckCircle },
  failed:      { label: "Failed",      color: "var(--color-destructive)",    icon: XCircle },
  in_progress: { label: "In Progress", color: "var(--color-status-idle)",    icon: Clock },
  pending:     { label: "Pending",     color: "var(--color-muted-foreground)", icon: Clock },
  skipped:     { label: "Skipped",     color: "var(--color-muted-foreground)", icon: AlertTriangle },
  paused:      { label: "Paused",      color: "var(--color-chart-4)",        icon: AlertTriangle },
}

export default function BackfillPage() {
  const userId = useTargetUserId()
  const { settings } = useSentinel()
  const [starting, setStarting] = useState(false)
  const [customMode, setCustomMode] = useState<"new_channels" | "full_reset" | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data, loading, error, refetch } = useApi(
    () => api.getBackfillProgress(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const handleStart = async () => {
    setStarting(true)
    try {
      await api.startBackfill(userId)
      await refetch()
    } catch (e) {
      console.error("Failed to start backfill:", e)
    } finally {
      setStarting(false)
    }
  }

  const handleCustom = async (mode: "new_channels" | "full_reset") => {
    setCustomMode(mode)
    try {
      await api.resetBackfill(userId, mode)
      await refetch()
    } catch (e) {
      console.error(`Failed to run custom backfill (${mode}):`, e)
    } finally {
      setCustomMode(null)
    }
  }

  if (loading) return <Spinner />
  if (error) return <EmptyState icon={Download} title="Error" message={error} />

  if (!data) {
    return (
      <EmptyState
        icon={Download}
        title="No Backfill Data"
        message="Start a backfill to retrieve historical message data from accessible channels."
      />
    )
  }

  const { summary, channels } = data
  const completedPct = summary.total > 0
    ? Math.round(((summary.completed + summary.skipped) / summary.total) * 100)
    : 0

  const filteredChannels = statusFilter === "all"
    ? channels
    : channels.filter((c) => c.status === statusFilter)

  const hasFailed = summary.failed > 0

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              Backfill Progress
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {hasFailed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStart}
                  disabled={starting || !!customMode}
                  className="h-8 text-xs"
                >
                  <RotateCcw className={`mr-1.5 h-3.5 w-3.5 ${starting ? "animate-spin" : ""}`} />
                  Retry Failed
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCustom("new_channels")}
                disabled={starting || !!customMode}
                className="h-8 text-xs"
                title="Re-fetch profile and add any newly joined mutual servers"
              >
                <PlusCircle className={`mr-1.5 h-3.5 w-3.5 ${customMode === "new_channels" ? "animate-spin" : ""}`} />
                {customMode === "new_channels" ? "Scanning…" : "Scan New Servers"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCustom("full_reset")}
                disabled={starting || !!customMode}
                className="h-8 text-xs text-destructive hover:text-destructive"
                title="Reset all progress and re-scan every channel from scratch"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${customMode === "full_reset" ? "animate-spin" : ""}`} />
                {customMode === "full_reset" ? "Resetting…" : "Full Reset"}
              </Button>
              <Button size="sm" onClick={handleStart} disabled={starting || !!customMode} className="h-8 text-xs">
                <Play className={`mr-1.5 h-3.5 w-3.5 ${starting ? "animate-spin" : ""}`} />
                {starting ? "Starting…" : "Start Backfill"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{completedPct}% complete</span>
              <span className="text-xs text-muted-foreground font-mono">
                {summary.totalMessagesFound.toLocaleString()} messages found
              </span>
            </div>
            <Progress value={completedPct} className="h-2" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {(["total", "pending", "in_progress", "completed", "failed", "skipped"] as const).map((key) => (
              <div
                key={key}
                className="rounded-lg bg-secondary/50 p-2 text-center cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => setStatusFilter(key === "total" ? "all" : statusFilter === key ? "all" : key)}
                style={{ outline: (key === "total" ? "all" : key) === statusFilter ? "1px solid var(--color-primary)" : undefined }}
              >
                <p
                  className="text-base font-bold"
                  style={{
                    color: key === "failed" ? "var(--color-destructive)"
                      : key === "completed" ? "var(--color-status-online)"
                      : key === "in_progress" ? "var(--color-status-idle)"
                      : "var(--color-foreground)"
                  }}
                >
                  {summary[key === "total" ? "total" : key as keyof typeof summary] as number}
                </p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{key.replace("_", " ")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Channel list */}
      {filteredChannels.length === 0 ? (
        <EmptyState icon={Download} message="No channels match this filter" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {filteredChannels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function ChannelRow({ channel }: { channel: BackfillChannelRow }) {
  const cfg = STATUS_CONFIG[channel.status] || STATUS_CONFIG.pending
  const Icon = cfg.icon

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: cfg.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-foreground truncate">{channel.channel_id}</span>
          <Badge
            variant="secondary"
            className="text-[9px] px-1.5 py-0"
            style={{ color: cfg.color, borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}10` }}
          >
            {cfg.label}
          </Badge>
          {channel.messages_found > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {channel.messages_found.toLocaleString()} msgs
            </span>
          )}
        </div>
        {channel.error && (
          <p className="mt-0.5 text-[10px] text-destructive truncate">{channel.error}</p>
        )}
        {channel.completed_at && (
          <p className="text-[10px] text-muted-foreground">{formatDateTime(channel.completed_at)}</p>
        )}
      </div>
      <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block truncate max-w-[120px]">
        {channel.guild_id}
      </span>
    </div>
  )
}
