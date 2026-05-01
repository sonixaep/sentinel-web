/* app/targets/[userId]/page.tsx */
"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatRelative } from "@/lib/utils"
import { EVENT_COLORS, EVENT_LABELS } from "@/lib/types"
import {
  Activity, Gamepad2, Music, Mic, AlertTriangle,
  Clock, MessageSquare, Ghost, Trash2, Edit,
  Download, Users, Sparkles,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default function TargetOverviewPage() {
  const params = useParams()
  const userId = params.userId as string
  const { targetStatuses, targets, cacheVersion, settings } = useSentinel()

  const status = targetStatuses[userId]
  const target = targets.find((t) => t.user_id === userId)

  const { data: timeline } = useApi(
    () => api.getTimeline(userId, { limit: "15" }),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )
  const { data: daily } = useApi(
    () => api.getDailySummaries(userId, 1),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )
  const { data: anomalies } = useApi(
    () => api.getAnomalies(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const { data: backfill } = useApi(
    () => api.getBackfillProgress(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const { data: socialData } = useApi(
    () => api.getSocialRelationships(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const presence         = status?.presence
  const activities       = status?.activities || []
  const voiceState       = status?.voiceState
  const todaySummary     = daily?.[0]
  const recentEvents     = timeline?.events || []
  const recentAnomalies  = (anomalies || []).slice(0, 3)

  const gamingActivity    = activities.find((a) => a.type === 0)
  const spotifyActivity   = activities.find((a) => a.type === 2)
  const streamingActivity = activities.find((a) => a.type === 1)
  const customStatus      = activities.find((a) => a.type === 4)

  const todayActiveMinutes = todaySummary
    ? (todaySummary.total_active_minutes ??
        (todaySummary.online_minutes + todaySummary.idle_minutes + todaySummary.dnd_minutes))
    : 0

  return (
    <div className="space-y-4">
      {customStatus?.state && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm italic text-muted-foreground">
          &quot;{customStatus.state}&quot;
        </div>
      )}

      {(gamingActivity || spotifyActivity || streamingActivity || voiceState) && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-online opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-status-online" />
              </span>
              Right Now
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {gamingActivity && (
              <ActivityTile icon={<Gamepad2 className="h-4 w-4" />} accent="var(--color-chart-1)"
                title={gamingActivity.name}
                sub={[gamingActivity.details, gamingActivity.state].filter(Boolean).join(" · ")}
              />
            )}
            {spotifyActivity && (
              <ActivityTile icon={<Music className="h-4 w-4" />} accent="var(--color-spotify)"
                title={spotifyActivity.details || "Spotify"}
                sub={spotifyActivity.state ? `by ${spotifyActivity.state}` : undefined}
              />
            )}
            {streamingActivity && (
              <ActivityTile icon={<Activity className="h-4 w-4" />} accent="var(--color-chart-4)"
                title={streamingActivity.name} sub={streamingActivity.details}
              />
            )}
            {voiceState && (
              <ActivityTile icon={<Mic className="h-4 w-4" />} accent="var(--color-status-online)"
                title="In Voice Channel"
                sub={[voiceState.streaming && "Streaming", voiceState.selfMute && "Muted", voiceState.selfDeaf && "Deafened"].filter(Boolean).join(" · ") || "Active"}
              />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {todaySummary && (
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Today — {todaySummary.date}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-4 gap-2">
                <StatCard value={`${todayActiveMinutes}m`}        label="Active"    color="var(--color-status-online)" icon={Activity}     />
                <StatCard value={todaySummary.message_count}       label="Messages"  color="var(--color-chart-3)"      icon={MessageSquare}/>
                <StatCard value={todaySummary.ghost_type_count}    label="Ghosts"    color="var(--color-chart-4)"      icon={Ghost}        />
                <StatCard value={todaySummary.delete_count}        label="Deleted"   color="var(--color-destructive)"  icon={Trash2}       />
                <StatCard value={`${todaySummary.voice_minutes}m`} label="Voice"     color="var(--color-chart-1)"      icon={Mic}          />
                <StatCard value={todaySummary.edit_count}          label="Edited"    color="var(--color-chart-3)"      icon={Edit}         />
                <StatCard
                  value={todaySummary.first_seen
                    ? new Date(todaySummary.first_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                  label="First Seen" color="var(--color-muted-foreground)" icon={Clock}
                />
                <StatCard value={todaySummary.reaction_count} label="Reactions" color="var(--color-chart-3)" icon={Activity} />
              </div>
            </CardContent>
          </Card>
        )}

        {recentAnomalies.length > 0 && (
          <Card className="border-destructive/25">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Active Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              {recentAnomalies.map((a, i) => (
                <AnomalyRow key={i} a={a} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {recentEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
              {recentEvents.map((event, i) => {
                const color = EVENT_COLORS[event.event_type] || "var(--color-muted-foreground)"
                const label = EVENT_LABELS[event.event_type] || event.event_type
                let detail  = ""
                try {
                  const d = typeof event.data === "string" ? JSON.parse(event.data) : event.data
                  if (d.newStatus)  detail = `${d.oldStatus || "?"} → ${d.newStatus}`
                  else if (d.name)  detail = d.name
                  else if (d.song)  detail = `${d.song} · ${d.artist}`
                } catch { /* ignore */ }

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/40 transition-colors"
                    style={{ minHeight: 40 }}
                  >
                    <div className="h-6 w-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border"
                          style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}
                        >
                          {label}
                        </span>
                        {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatRelative(event.timestamp)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backfill progress compact indicator */}
      {backfill && backfill.summary.total > 0 && (() => {
        const { summary } = backfill
        const pct = Math.round(((summary.completed + summary.skipped) / summary.total) * 100)
        const isActive = summary.in_progress > 0
        return (
          <Link href={`/targets/${userId}/backfill`}>
            <Card className="hover:bg-secondary/30 transition-colors cursor-pointer border-chart-1/20">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    Backfill
                    {isActive && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-idle opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-status-idle" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {summary.totalMessagesFound.toLocaleString()} msgs · {pct}%
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
                {summary.failed > 0 && (
                  <p className="mt-1 text-[10px] text-destructive">{summary.failed} channels failed</p>
                )}
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {/* Top AI-classified relationships */}
      {socialData && socialData.connections.some((c) => c.aiClassification) && (() => {
        const aiConns = socialData.connections
          .filter((c) => c.aiClassification)
          .slice(0, 3)
        return (
          <Link href={`/targets/${userId}/analytics?tab=social`}>
            <Card className="hover:bg-secondary/30 transition-colors cursor-pointer border-chart-5/20">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-chart-5" />
                  AI Relationships
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 space-y-1.5">
                {aiConns.map((conn, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="font-mono text-[10px] text-muted-foreground truncate">…{conn.userId.slice(-8)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border"
                        style={{ color: "var(--color-chart-5)", borderColor: "var(--color-chart-5)30", backgroundColor: "var(--color-chart-5)10" }}>
                        {conn.aiClassification!.replace(/_/g, " ")}
                      </span>
                      {conn.aiConfidence !== null && (
                        <span className="text-[10px] text-muted-foreground">{Math.round((conn.aiConfidence ?? 0) * 100)}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {target?.notes && (
        <Card className="border-chart-1/20">
          <CardHeader className="pb-2 pt-3"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent className="pb-3">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{target.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ActivityTile({ icon, title, sub, accent }: { icon: React.ReactNode; title: string; sub?: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}25` }}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}20`, color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

function StatCard({ value, label, color, icon: Icon }: { value: string | number; label: string; color: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl p-2 text-center" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}>
      <Icon className="mb-1 h-3 w-3 opacity-70" style={{ color }} />
      <p className="text-xs font-bold leading-none" style={{ color }}>{value}</p>
      <p className="mt-1 text-[8px] uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
    </div>
  )
}

function AnomalyRow({ a }: { a: { severity: string; type: string; description: string; timestamp: number } }) {
  const severityColor = a.severity === "high" ? "var(--color-destructive)" : a.severity === "medium" ? "var(--color-status-idle)" : "var(--color-muted-foreground)"
  const variant = (a.severity === "high" ? "destructive" : a.severity === "medium" ? "warning" : "secondary") as "destructive" | "warning" | "secondary"
  return (
    <div className="flex items-start gap-3 rounded-lg bg-secondary/50 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: severityColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={variant}>{a.severity}</Badge>
          <span className="text-[10px] text-muted-foreground">{a.type}</span>
        </div>
        <p className="mt-1 text-xs">{a.description}</p>
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatRelative(a.timestamp)}</span>
    </div>
  )
}