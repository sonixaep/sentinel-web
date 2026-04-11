/* app/targets/[userId]/analytics/page.tsx */
"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { DiscordId } from "@/components/ui/discord-id"
import { LineChart } from "@/components/charts/line-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { Heatmap } from "@/components/charts/heatmap"
import { useApi } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatMs } from "@/lib/utils"
import { STATUS_COLORS } from "@/lib/types"
import { BarChart3, Activity, MessageSquare, Mic, Music, Users } from "lucide-react"

export default function AnalyticsPage() {
  const params = useParams()
  const userId = params.userId as string

  return (
    <Tabs defaultValue="presence">
      {/* Horizontally scrollable tabs for mobile */}
      <div
        className="overflow-x-auto mb-5 -mx-3 px-3 md:mx-0 md:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        <TabsList className="inline-flex min-w-max md:flex">
          <TabsTrigger value="presence">Presence</TabsTrigger>
          <TabsTrigger value="activities">Gaming</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="music">Music</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="presence"><PresenceTab userId={userId} /></TabsContent>
      <TabsContent value="activities"><ActivitiesTab userId={userId} /></TabsContent>
      <TabsContent value="messages"><MessagesTab userId={userId} /></TabsContent>
      <TabsContent value="voice"><VoiceTab userId={userId} /></TabsContent>
      <TabsContent value="music"><MusicTab userId={userId} /></TabsContent>
      <TabsContent value="social"><SocialTab userId={userId} /></TabsContent>
    </Tabs>
  )
}

function StatCard({
  value,
  label,
  color,
  sub,
}: {
  value: string | number
  label: string
  color?: string
  sub?: string
}) {
  const c = color || "var(--color-foreground)"
  return (
    <div
      className="rounded-xl p-3 md:p-4"
      style={{ backgroundColor: `${c}10`, border: `1px solid ${c}20` }}
    >
      <p className="text-[9px] md:text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg md:text-xl font-bold leading-tight" style={{ color: c }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[9px] md:text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Presence ──────────────────────────────────────────────────────────────────

function PresenceTab({ userId }: { userId: string }) {
  const { settings, cacheVersion } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getPresenceAnalytics(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )
  const { data: daily } = useApi(
    () => api.getDailySummaries(userId, 30),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Activity} title="Error" message={error} />
  if (!data)   return <EmptyState icon={Activity} message="No presence data" />

  const pieData = (data.sessions || [])
    .map((s) => ({
      label: s.status,
      value: s.total_ms || 0,
      color: STATUS_COLORS[s.status] || STATUS_COLORS.offline,
    }))
    .filter((d) => d.value > 0)

  const platformData = (data.platformBreakdown || []).map((p) => ({
    label: p.platform || "Unknown",
    value: p.total_ms || 0,
    color:
      p.platform === "desktop"
        ? "var(--color-chart-1)"
        : p.platform === "mobile"
          ? "var(--color-status-online)"
          : "var(--color-chart-3)",
  }))

  const dailyActive = (daily || [])
    .slice()
    .reverse()
    .map((d) => ({
      label: d.date?.slice(5) || "",
      value:
        d.total_active_minutes ??
        d.online_minutes + d.idle_minutes + d.dnd_minutes,
    }))

  return (
    <div className="space-y-5">
      {(data.totalActiveMs ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            value={formatMs(data.totalActiveMs ?? 0)}
            label="Total Active"
            color="var(--color-status-online)"
            sub="Online+Idle+DND"
          />
          {(data.sessions || []).map((s) => (
            <StatCard
              key={s.status}
              value={formatMs(s.total_ms || 0)}
              label={s.status.charAt(0).toUpperCase() + s.status.slice(1)}
              color={STATUS_COLORS[s.status] || STATUS_COLORS.offline}
              sub={`${s.count} sessions`}
            />
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Time Distribution</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0
              ? <PieChart data={pieData} size={110} formatValue={formatMs} />
              : <EmptyState message="No data" />
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Platform Usage</CardTitle></CardHeader>
          <CardContent>
            {platformData.length > 0
              ? <PieChart data={platformData} size={100} formatValue={formatMs} />
              : <EmptyState message="No data" />
            }
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Active Minutes — 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyActive.length > 0
            ? <LineChart data={dailyActive} color="var(--color-status-online)" formatValue={(v) => `${v}m`} />
            : <EmptyState message="No data" />
          }
        </CardContent>
      </Card>
    </div>
  )
}

// ── Activities / gaming ───────────────────────────────────────────────────────

function ActivitiesTab({ userId }: { userId: string }) {
  const { settings, cacheVersion } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getActivityAnalytics(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={BarChart3} title="Error" message={error} />
  if (!data)   return <EmptyState icon={BarChart3} message="No gaming data" />

  const games   = (data.games || []).slice(0, 15)
  const barData = games.map((g) => ({
    label: g.name,
    value: g.totalPlaytimeMs,
    color: "var(--color-chart-1)",
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <StatCard value={formatMs(data.totalGamingMs || 0)} label="Total Gaming" color="var(--color-chart-1)" />
        <StatCard value={games.length}                      label="Games"        color="var(--color-chart-3)" />
        <StatCard value={`${data.peakGamingHour ?? "—"}:00`} label="Peak Hour"  color="var(--color-chart-4)" />
      </div>
      {data.recentlyStarted?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">New:</span>
          {data.recentlyStarted.map((g, i) => (
            <span
              key={i}
              className="rounded-md bg-status-online/10 px-2 py-1 text-xs text-status-online border border-status-online/20"
            >
              {g}
            </span>
          ))}
        </div>
      )}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top Games by Playtime</CardTitle></CardHeader>
        <CardContent>
          {barData.length > 0
            ? <BarChart data={barData} formatValue={formatMs} />
            : <EmptyState message="No games played" />
          }
        </CardContent>
      </Card>
    </div>
  )
}

// ── Messages ──────────────────────────────────────────────────────────────────

function MessagesTab({ userId }: { userId: string }) {
  const { settings, cacheVersion } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getMessageAnalytics(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )
  const { data: heatmapData } = useApi(
    () => api.getHeatmap(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={MessageSquare} title="Error" message={error} />
  if (!data)   return <EmptyState icon={MessageSquare} message="No message data" />

  const hourData = (data.messagesByHour || new Array(24).fill(0)).map((v: number, i: number) => ({
    label: `${i}`,
    value: v,
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard value={data.totalMessages || 0}                            label="Messages"  color="var(--color-chart-3)" />
        <StatCard value={data.avgWordCount?.toFixed(1) || 0}                 label="Avg Words" color="var(--color-chart-1)" />
        <StatCard value={`${((data.editRate || 0) * 100).toFixed(1)}%`}     label="Edit Rate" color="var(--color-status-idle)" />
        <StatCard value={`${((data.deleteRate || 0) * 100).toFixed(1)}%`}   label="Delete Rate" color="var(--color-destructive)" />
        <StatCard value={`${((data.ghostTypeRate || 0) * 100).toFixed(1)}%`} label="Ghost Rate" color="var(--color-chart-4)" />
        <StatCard value={`${((data.replyRate || 0) * 100).toFixed(1)}%`}    label="Reply Rate" color="var(--color-chart-5)" />
        <StatCard value={data.avgMessageLength || 0}                         label="Avg Length" color="var(--color-chart-1)" />
        <StatCard value={(data.vocabularyRichness || 0).toFixed(3)}          label="Vocab"     color="var(--color-chart-3)" />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Messages by Hour</CardTitle></CardHeader>
        <CardContent><LineChart data={hourData} color="var(--color-chart-3)" height={130} /></CardContent>
      </Card>
      {heatmapData?.weeklyGrid && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly Activity Heatmap</CardTitle></CardHeader>
          <CardContent>
            <Heatmap
              data={heatmapData.weeklyGrid.map((row) => row.map((b) => b.eventCount))}
              color="var(--color-chart-3)"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Voice ─────────────────────────────────────────────────────────────────────

function VoiceTab({ userId }: { userId: string }) {
  const { settings, cacheVersion } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getVoiceAnalytics(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Mic} title="Error" message={error} />
  if (!data)   return <EmptyState icon={Mic} message="No voice data" />

  // Use channel ID as bar label (truncated for chart readability)
  const channelData = (data.preferredChannels || []).slice(0, 10).map((c) => ({
    label: `…${c.channelId.slice(-10)}`,
    value: c.totalMs,
    color: "var(--color-status-online)",
  }))
  const byHourData = (data.byHour || []).map((v, i) => ({ label: `${i}`, value: v }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard value={formatMs(data.totalVoiceMs || 0)}              label="Total Voice"  color="var(--color-status-online)" />
        <StatCard value={data.sessionCount || 0}                         label="Sessions"     color="var(--color-chart-1)" />
        <StatCard value={formatMs(data.avgSessionMs || 0)}               label="Avg Session"  color="var(--color-chart-3)" />
        <StatCard value={`${((data.muteRatio || 0) * 100).toFixed(0)}%`} label="Muted"        color="var(--color-status-idle)" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {channelData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Channels</CardTitle></CardHeader>
            <CardContent><BarChart data={channelData} formatValue={formatMs} /></CardContent>
          </Card>
        )}
        {byHourData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Voice by Hour</CardTitle></CardHeader>
            <CardContent>
              <LineChart data={byHourData} color="var(--color-status-online)" height={130} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full channel IDs with clickable links */}
      {(data.preferredChannels || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Channel Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data.preferredChannels || []).slice(0, 10).map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
              >
                <DiscordId type="channel" id={c.channelId} guildId={c.guildId} />
                <div className="text-right text-xs text-muted-foreground flex-shrink-0 ml-4">
                  <span className="font-medium" style={{ color: "var(--color-status-online)" }}>
                    {formatMs(c.totalMs)}
                  </span>
                  <span className="ml-1.5">{c.sessions} sessions</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Music ─────────────────────────────────────────────────────────────────────

function MusicTab({ userId }: { userId: string }) {
  const { settings, cacheVersion } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getMusicAnalytics(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Music} title="Error" message={error} />
  if (!data)   return <EmptyState icon={Music} message="No music data" />

  const hourData = (data.listeningByHour || []).map((v, i) => ({ label: `${i}`, value: v }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <StatCard value={formatMs(data.totalListeningMs || 0)} label="Listen Time" color="var(--color-spotify)" />
        <StatCard value={data.sessionCount || 0}               label="Sessions"    color="var(--color-chart-1)" />
        <StatCard value={data.topArtists?.[0]?.name || "—"}   label="Top Artist"  color="var(--color-chart-3)" />
      </div>
      {data.recentTrack && (
        <Card style={{ borderColor: "var(--color-spotify)30" }}>
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: "linear-gradient(135deg, var(--color-spotify)15, transparent)" }}
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--color-spotify)20" }}
            >
              <Music className="h-5 w-5" style={{ color: "var(--color-spotify)" }} />
            </div>
            <div className="min-w-0">
              <p
                className="text-[9px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-spotify)" }}
              >
                Last Played
              </p>
              <p className="font-semibold truncate">{data.recentTrack.song}</p>
              <p className="text-xs text-muted-foreground truncate">
                by {data.recentTrack.artist}
                {data.recentTrack.album && ` — ${data.recentTrack.album}`}
              </p>
            </div>
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {data.topArtists?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Artists</CardTitle></CardHeader>
            <CardContent>
              <BarChart
                data={data.topArtists.slice(0, 10).map((a) => ({
                  label: a.name,
                  value: a.listens,
                  color: "var(--color-spotify)",
                }))}
              />
            </CardContent>
          </Card>
        )}
        {hourData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Listening by Hour</CardTitle></CardHeader>
            <CardContent>
              <LineChart data={hourData} color="var(--color-spotify)" height={130} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── Social ────────────────────────────────────────────────────────────────────

function SocialTab({ userId }: { userId: string }) {
  const { settings, cacheVersion } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getSocialGraph(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Users} title="Error" message={error} />
  if (!data || !data.connections?.length) return <EmptyState icon={Users} message="No social data yet" />

  const connections = data.connections.slice(0, 20)
  const maxScore    = connections[0]?.score || 1

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <StatCard value={data.connections.length} label="Connections"  color="var(--color-chart-1)" />
        <StatCard value={data.totalInteractions}  label="Interactions" color="var(--color-chart-3)" />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top Connections</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {connections.map((conn, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/70"
              style={{
                backgroundColor: "var(--color-secondary)",
                border: "1px solid var(--color-border)",
                minHeight: 48,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--color-chart-1), var(--color-chart-5))",
                    opacity: 0.5 + (conn.score / maxScore) * 0.5,
                  }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <DiscordId type="user" id={conn.userId} textSize="text-xs" />
                  <p className="text-[10px] text-muted-foreground capitalize">{conn.relationship}</p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground flex-shrink-0 ml-2">
                <p className="font-semibold" style={{ color: "var(--color-chart-1)" }}>
                  {conn.score.toFixed(1)}
                </p>
                <p className="hidden sm:block">{conn.messageInteractions}msg</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}