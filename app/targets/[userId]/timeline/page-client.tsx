/* app/targets/[userId]/timeline/page.tsx */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { TimelineBar } from "@/components/charts/timeline-bar"
import { useApi, useDebounce, useTargetUserId } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatTime, formatDate } from "@/lib/utils"
import { EVENT_COLORS, EVENT_LABELS, STATUS_COLORS } from "@/lib/types"
import { Clock, Filter, ChevronLeft, ChevronRight, ExternalLink, Search, Calendar, X } from "lucide-react"

export default function TimelinePage() {
  const userId  = useTargetUserId()
  const { settings } = useSentinel()

  // List mode state
  const [offset, setOffset]           = useState(0)
  const [typeFilter, setTypeFilter]   = useState("")
  const [search, setSearch]           = useState("")
  const [since, setSince]             = useState("")
  const [until, setUntil]             = useState("")
  const limit = 100

  // Range view state
  const [mode, setMode]               = useState<"live" | "range">("live")
  const [rangeFrom, setRangeFrom]     = useState("")
  const [rangeTo, setRangeTo]         = useState("")
  const [rangeSubmitted, setRangeSubmitted] = useState<{ from: string; to: string } | null>(null)

  const debouncedSearch = useDebounce(search, 350)

  const timelineParams: Record<string, string> = {
    limit: String(limit),
    offset: String(offset),
  }
  if (typeFilter)       timelineParams.type   = typeFilter
  if (debouncedSearch)  timelineParams.search = debouncedSearch
  if (since)            timelineParams.since  = String(new Date(since + "T00:00:00").getTime())
  if (until)            timelineParams.until  = String(new Date(until + "T23:59:59").getTime())

  const { data, loading, error } = useApi(
    () => api.getTimeline(userId, timelineParams),
    [userId, offset, typeFilter, debouncedSearch, since, until, settings.sentinelToken],
    !!settings.sentinelToken && mode === "live"
  )

  const { data: rangeData, loading: rangeLoading, error: rangeError } = useApi(
    () => api.getTimelineRange(userId, rangeSubmitted!.from, rangeSubmitted!.to),
    [userId, rangeSubmitted?.from, rangeSubmitted?.to, settings.sentinelToken],
    !!settings.sentinelToken && mode === "range" && !!rangeSubmitted
  )

  const handleRangeSubmit = () => {
    if (!rangeFrom || !rangeTo) return
    setRangeSubmitted({ from: rangeFrom, to: rangeTo })
    setMode("range")
  }

  const handleClearRange = () => {
    setMode("live")
    setRangeSubmitted(null)
  }

  const now        = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const todayEnd   = todayStart + 86_400_000

  // Build gantt from range data or today's live data
  const presenceSrc  = mode === "range" ? (rangeData?.presenceSessions  as any[] | undefined) : data?.presenceSessions
  const activitySrc  = mode === "range" ? (rangeData?.activitySessions  as any[] | undefined) : data?.activitySessions
  const voiceSrc     = mode === "range" ? (rangeData?.voiceSessions     as any[] | undefined) : data?.voiceSessions

  const ganttStart = mode === "range" && rangeSubmitted
    ? new Date(rangeSubmitted.from + "T00:00:00").getTime()
    : todayStart
  const ganttEnd = mode === "range" && rangeSubmitted
    ? new Date(rangeSubmitted.to + "T23:59:59").getTime()
    : todayEnd

  const ganttSessions: { type: string; label: string; start: number; end: number; color: string }[] = []

  for (const ps of presenceSrc || []) {
    if (ps.start_time < ganttEnd && (ps.end_time || now) > ganttStart) {
      ganttSessions.push({
        type:  "Status",
        label: `${ps.status} (${ps.platform || "?"})`,
        start: Math.max(ps.start_time, ganttStart),
        end:   Math.min(ps.end_time || now, ganttEnd),
        color: STATUS_COLORS[ps.status] || STATUS_COLORS.offline,
      })
    }
  }
  for (const as_ of activitySrc || []) {
    if (as_.start_time < ganttEnd && (as_.end_time || now) > ganttStart) {
      ganttSessions.push({
        type:  "Activity",
        label: `${as_.activity_name}${as_.details ? " — " + as_.details : ""}`,
        start: Math.max(as_.start_time, ganttStart),
        end:   Math.min(as_.end_time || now, ganttEnd),
        color: as_.activity_type === 2 ? "var(--color-spotify)" : "var(--color-chart-1)",
      })
    }
  }
  for (const vs of voiceSrc || []) {
    if (vs.start_time < ganttEnd && (vs.end_time || now) > ganttStart) {
      ganttSessions.push({
        type:  "Voice",
        label: vs.channel_name || vs.channel_id,
        start: Math.max(vs.start_time, ganttStart),
        end:   Math.min(vs.end_time || now, ganttEnd),
        color: "var(--color-status-online)",
      })
    }
  }

  const events     = data?.events || []
  const eventTypes = [...new Set(events.map((e) => e.event_type))].sort()

  const isLoading = loading || (mode === "range" && rangeLoading)
  const hasError  = error || (mode === "range" && rangeError)

  if (isLoading) return <Spinner />
  if (hasError)  return <EmptyState icon={Clock} title="Error" message={String(hasError)} />

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Date Range View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1 flex-1 min-w-[130px]">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">From</label>
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="h-9 w-full rounded-md border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[130px]">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</label>
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="h-9 w-full rounded-md border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button
              size="sm"
              onClick={handleRangeSubmit}
              disabled={!rangeFrom || !rangeTo}
              className="h-9"
            >
              View Range
            </Button>
            {mode === "range" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearRange}
                className="h-9"
              >
                <X className="h-4 w-4 mr-1" /> Today
              </Button>
            )}
          </div>
          {mode === "range" && rangeData && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              {rangeData.dateRange.days} days · {rangeData.eventCount.toLocaleString()} events
            </p>
          )}
        </CardContent>
      </Card>

      {/* Gantt chart */}
      {ganttSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">
              {mode === "range" && rangeSubmitted
                ? `${rangeSubmitted.from} → ${rangeSubmitted.to}`
                : "Today's Timeline"}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: 480 }}>
              <TimelineBar sessions={ganttSessions} dayStart={ganttStart} dayEnd={ganttEnd} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + filter (live mode only) */}
      {mode === "live" && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0) }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
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
          </div>

          {/* Date filter row */}
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1 flex-1 min-w-[130px]">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Since</label>
              <input
                type="date"
                value={since}
                onChange={(e) => { setSince(e.target.value); setOffset(0) }}
                className="h-9 w-full rounded-md border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[130px]">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Until</label>
              <input
                type="date"
                value={until}
                onChange={(e) => { setUntil(e.target.value); setOffset(0) }}
                className="h-9 w-full rounded-md border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {(since || until) && (
              <button
                onClick={() => { setSince(""); setUntil(""); setOffset(0) }}
                className="self-end h-9 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{events.length} events</span>
            {offset > 0 && <span>Offset {offset}</span>}
          </div>

          {/* Event list */}
          <Card className="overflow-hidden">
            <div
              className="divide-y max-h-[560px] overflow-y-auto"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {events.length === 0 ? (
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
                      <div className="h-8 w-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border"
                            style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}
                          >
                            {label}
                          </span>
                        </div>
                        {detail && <p className="mt-0.5 text-sm text-foreground truncate">{detail}</p>}
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
          {events.length >= limit && (
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
        </>
      )}
    </div>
  )
}