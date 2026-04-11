/* app/targets/[userId]/timeline/page.tsx */
"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { TimelineBar } from "@/components/charts/timeline-bar"
import { useApi } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatTime, formatDate } from "@/lib/utils"
import { EVENT_COLORS, EVENT_LABELS, STATUS_COLORS } from "@/lib/types"
import { Clock, Filter, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TimelinePage() {
  const params  = useParams()
  const userId  = params.userId as string
  const { settings } = useSentinel()
  const [offset, setOffset]         = useState(0)
  const [typeFilter, setTypeFilter] = useState("")
  const limit = 100

  const { data, loading, error } = useApi(
    () => api.getTimeline(userId, {
      limit: String(limit),
      offset: String(offset),
      ...(typeFilter ? { type: typeFilter } : {}),
    }),
    [userId, offset, typeFilter, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Clock} title="Error" message={error} />
  if (!data)   return <EmptyState icon={Clock} message="No timeline data" />

  const { events, presenceSessions, activitySessions, voiceSessions } = data
  const now        = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const todayEnd   = todayStart + 86_400_000

  const ganttSessions: {
    type: string
    label: string
    start: number
    end: number
    color: string
  }[] = []

  for (const ps of presenceSessions || []) {
    if (ps.start_time < todayEnd && (ps.end_time || now) > todayStart) {
      ganttSessions.push({
        type:  "Status",
        label: `${ps.status} (${ps.platform || "?"})`,
        start: Math.max(ps.start_time, todayStart),
        end:   Math.min(ps.end_time || now, todayEnd),
        color: STATUS_COLORS[ps.status] || STATUS_COLORS.offline,
      })
    }
  }
  for (const as_ of activitySessions || []) {
    if (as_.start_time < todayEnd && (as_.end_time || now) > todayStart) {
      ganttSessions.push({
        type:  "Activity",
        label: `${as_.activity_name}${as_.details ? " — " + as_.details : ""}`,
        start: Math.max(as_.start_time, todayStart),
        end:   Math.min(as_.end_time || now, todayEnd),
        color: as_.activity_type === 2 ? "var(--color-spotify)" : "var(--color-chart-1)",
      })
    }
  }
  for (const vs of voiceSessions || []) {
    if (vs.start_time < todayEnd && (vs.end_time || now) > todayStart) {
      ganttSessions.push({
        type:  "Voice",
        label: vs.channel_name || vs.channel_id,
        start: Math.max(vs.start_time, todayStart),
        end:   Math.min(vs.end_time || now, todayEnd),
        color: "var(--color-status-online)",
      })
    }
  }

  const eventTypes = [...new Set((events || []).map((e) => e.event_type))].sort()

  return (
    <div className="space-y-4">
      {/* Gantt chart */}
      {ganttSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">Today&apos;s Timeline</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: 480 }}>
              <TimelineBar sessions={ganttSessions} dayStart={todayStart} dayEnd={todayEnd} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setOffset(0) }}
            className="h-10 flex-1 rounded-md border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Events</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>{EVENT_LABELS[t] || t}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
          {events?.length || 0} events
        </span>
      </div>

      {/* Event list */}
      <Card className="overflow-hidden">
        <div
          className="divide-y max-h-[560px] overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {(!events || events.length === 0) ? (
            <EmptyState icon={Clock} message="No events found" className="py-12" />
          ) : (
            events.map((event) => {
              const color = EVENT_COLORS[event.event_type] || "var(--color-muted-foreground)"
              const label = EVENT_LABELS[event.event_type] || event.event_type
              let detail  = ""
              let discordUrl: string | null = null

              try {
                const d = typeof event.data === "string" ? JSON.parse(event.data) : {}
                if (d.newStatus)   detail = `${d.oldStatus || "?"} → ${d.newStatus}`
                else if (d.name)   detail = d.name
                else if (d.changes && Array.isArray(d.changes)) detail = d.changes.join(", ")
                else if (d.song)   detail = `${d.song} – ${d.artist ?? ""}`

                // Build Discord URL if we have channel info
                const channelId = (d.channelId || d.channel_id || event.channel_id) as string | undefined
                const guildId   = (d.guildId   || d.guild_id   || event.guild_id)   as string | undefined
                if (channelId) {
                  discordUrl = guildId
                    ? `https://discord.com/channels/${guildId}/${channelId}`
                    : `https://discord.com/channels/@me/${channelId}`
                }
              } catch { /* ignore */ }

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-secondary/40 transition-colors"
                  style={{ minHeight: 52 }}
                >
                  <div
                    className="h-8 w-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border"
                        style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}
                      >
                        {label}
                      </span>
                    </div>
                    {detail && (
                      <p className="mt-0.5 text-sm text-foreground truncate">{detail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                  {discordUrl && (
                      <a
                        href={discordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Open in Discord"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="hidden sm:inline">Discord</span>
                      </a>
                    )}
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</p>
                      <p className="text-[10px] text-muted-foreground/60">{formatDate(event.timestamp)}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Pagination */}
      {events && events.length >= limit && (
        <div className="flex gap-2">
          {offset > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="flex-1 h-10"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset(offset + limit)}
            className="flex-1 h-10"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}