/* app/targets/[userId]/analytics/page.tsx */
"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef, useMemo } from "react"
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
import { formatMs, getAvatarUrl, userIdToHue } from "@/lib/utils"
import { STATUS_COLORS } from "@/lib/types"
import type { SocialConnection, ProfileSnapshot } from "@/lib/types"
import {
  BarChart3, Activity, MessageSquare, Mic, Music, Users, Tag,
  TrendingUp, RefreshCw, Sparkles, Share2, List,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function AnalyticsPage() {
  const params = useParams()
  const userId = params.userId as string

  return (
    <Tabs defaultValue="presence">
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
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="baselines">Baselines</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="presence"><PresenceTab userId={userId} /></TabsContent>
      <TabsContent value="activities"><ActivitiesTab userId={userId} /></TabsContent>
      <TabsContent value="messages"><MessagesTab userId={userId} /></TabsContent>
      <TabsContent value="voice"><VoiceTab userId={userId} /></TabsContent>
      <TabsContent value="music"><MusicTab userId={userId} /></TabsContent>
      <TabsContent value="social"><SocialTab userId={userId} /></TabsContent>
      <TabsContent value="categories"><CategoriesTab userId={userId} /></TabsContent>
      <TabsContent value="baselines"><BaselinesTab userId={userId} /></TabsContent>
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

// ── Activities ────────────────────────────────────────────────────────────────

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
        <StatCard value={data.totalMessages || 0}                            label="Messages"    color="var(--color-chart-3)" />
        <StatCard value={data.avgWordCount?.toFixed(1) || 0}                 label="Avg Words"   color="var(--color-chart-1)" />
        <StatCard value={`${((data.editRate || 0) * 100).toFixed(1)}%`}     label="Edit Rate"   color="var(--color-status-idle)" />
        <StatCard value={`${((data.deleteRate || 0) * 100).toFixed(1)}%`}   label="Delete Rate" color="var(--color-destructive)" />
        <StatCard value={`${((data.ghostTypeRate || 0) * 100).toFixed(1)}%`} label="Ghost Rate" color="var(--color-chart-4)" />
        <StatCard value={`${((data.replyRate || 0) * 100).toFixed(1)}%`}    label="Reply Rate"  color="var(--color-chart-5)" />
        <StatCard value={data.avgMessageLength || 0}                         label="Avg Length"  color="var(--color-chart-1)" />
        <StatCard value={(data.vocabularyRichness || 0).toFixed(3)}          label="Vocab"       color="var(--color-chart-3)" />
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
        <StatCard value={`${((data.muteRatio || 0) * 100).toFixed(0)}%`} label="Muted"       color="var(--color-status-idle)" />
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
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-spotify)" }}>
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

// ══════════════════════════════════════════════════════════════════════════════
// SOCIAL GRAPH — Draggable force graph with spring physics
// ══════════════════════════════════════════════════════════════════════════════

const AI_CLASS_COLORS: Record<string, string> = {
  close_friend:                "var(--color-status-online)",
  potential_romantic_interest: "var(--color-chart-4)",
  acquaintance:                "var(--color-chart-3)",
  colleague:                   "var(--color-chart-1)",
  rival:                       "var(--color-destructive)",
  mentor:                      "var(--color-chart-5)",
  mentee:                      "var(--color-chart-5)",
}

const AI_CLASS_LABELS: Record<string, string> = {
  close_friend:                "Close Friend",
  potential_romantic_interest: "Romantic Interest",
  acquaintance:                "Acquaintance",
  colleague:                   "Colleague",
  rival:                       "Rival",
  mentor:                      "Mentor",
  mentee:                      "Mentee",
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ForceNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  isCenter: boolean
  score: number
}

// ── Hook: fetch profiles for a list of user IDs ────────────────────────────

function useRelatedProfiles(
  userIds: string[],
  token: string
): Record<string, ProfileSnapshot | null> {
  const [profiles, setProfiles] = useState<Record<string, ProfileSnapshot | null>>({})
  const key = userIds.slice(0, 15).join(",")

  useEffect(() => {
    if (!userIds.length || !token) return
    let cancelled = false

    const toFetch = userIds.slice(0, 15)
    Promise.allSettled(toFetch.map((id) => api.getCurrentProfile(id))).then(
      (results) => {
        if (cancelled) return
        const map: Record<string, ProfileSnapshot | null> = {}
        results.forEach((r, i) => {
          map[toFetch[i]] = r.status === "fulfilled" ? r.value : null
        })
        setProfiles(map)
      }
    )

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token])

  return profiles
}

// ── Helper: generate initial node positions ──────────────────────────────────

function generateInitialNodes(
  centerUserId: string,
  connections: SocialConnection[],
  w: number,
  h: number
): ForceNode[] {
  const cx        = w / 2
  const cy        = h / 2
  const maxScore  = connections[0]?.score || 1
  const spread    = Math.min(w, h) * 0.30

  return [
    {
      id: centerUserId,
      x: cx, y: cy,
      vx: 0, vy: 0,
      radius: 34,
      isCenter: true,
      score: maxScore,
    },
    ...connections.map((conn, i) => {
      const angle  = (i / Math.max(connections.length, 1)) * Math.PI * 2 - Math.PI / 2
      const jitter = 0.80 + Math.random() * 0.40
      const r      = 13 + (conn.score / maxScore) * 15
      return {
        id: conn.userId,
        x: cx + Math.cos(angle) * spread * jitter,
        y: cy + Math.sin(angle) * spread * jitter,
        vx: 0, vy: 0,
        radius: r,
        isCenter: false,
        score: conn.score,
      }
    }),
  ]
}

// ── NodeCircle SVG element ────────────────────────────────────────────────────

function NodeCircle({
  node,
  profile,
  isHighlighted,
  isDimmed,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}: {
  node: ForceNode
  profile: ProfileSnapshot | null
  isHighlighted: boolean
  isDimmed: boolean
  onMouseEnter: (e: React.MouseEvent<SVGGElement>) => void
  onMouseLeave: () => void
  onMouseDown: (e: React.MouseEvent<SVGGElement>, nodeId: string) => void
}) {
  const hue      = userIdToHue(node.id)
  const avatarUrl = profile?.avatar_hash
    ? getAvatarUrl(node.id, profile.avatar_hash, 128)
    : null
  const clipId   = `clip-sg-${node.id.replace(/\D/g, "").slice(-10)}`
  const filterId = `glow-sg-${node.id.replace(/\D/g, "").slice(-10)}`

  const ringColor = node.isCenter
    ? "var(--color-primary)"
    : isHighlighted
      ? "var(--color-primary)"
      : "var(--color-border)"
  const ringWidth = node.isCenter ? 2.5 : isHighlighted ? 2.5 : 1.5
  const opacity   = isDimmed ? 0.30 : 1

  return (
    <g
      style={{ cursor: node.isCenter ? "default" : "pointer", opacity }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={node.x} cy={node.y} r={Math.max(1, node.radius - 1)} />
        </clipPath>
        {(isHighlighted || node.isCenter) && (
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={node.isCenter ? 5 : 4} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Outer glow ring for highlighted / center */}
      {(isHighlighted || node.isCenter) && (
        <circle
          cx={node.x} cy={node.y} r={node.radius + (node.isCenter ? 6 : 5)}
          fill="none"
          stroke={node.isCenter ? "var(--color-primary)" : "var(--color-chart-1)"}
          strokeWidth={1}
          opacity={node.isCenter ? 0.35 : 0.25}
        />
      )}

      {/* Background colour fill */}
      <circle
        cx={node.x} cy={node.y} r={node.radius}
        fill={`hsl(${hue}, 50%, 22%)`}
        filter={isHighlighted || node.isCenter ? `url(#${filterId})` : undefined}
      />

      {/* Avatar image */}
      {avatarUrl && (
        <image
          href={avatarUrl}
          x={node.x - node.radius}
          y={node.y - node.radius}
          width={node.radius * 2}
          height={node.radius * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* Initials fallback */}
      {!avatarUrl && (
        <text
          x={node.x}
          y={node.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={Math.max(8, node.radius * 0.52)}
          fontWeight="700"
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {node.id.slice(-2).toUpperCase()}
        </text>
      )}

      {/* Border ring */}
      <circle
        cx={node.x} cy={node.y} r={node.radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={ringWidth}
      />

      {/* Center badge dot */}
      {node.isCenter && (
        <circle
          cx={node.x} cy={node.y - node.radius - 7} r={4}
          fill="var(--color-primary)"
        />
      )}
    </g>
  )
}

// ── SocialForceGraph ──────────────────────────────────────────────────────────

function SocialForceGraph({
  userId,
  connections,
  relatedProfiles,
  targetProfile,
}: {
  userId: string
  connections: SocialConnection[]
  relatedProfiles: Record<string, ProfileSnapshot | null>
  targetProfile: ProfileSnapshot | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 620, h: 460 })
  const [tooltip, setTooltip] = useState<{ connId: string; mx: number; my: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [pinnedTooltipId, setPinnedTooltipId] = useState<string | null>(null)

  // Graph nodes state and ref
  const [nodes, setNodes] = useState<ForceNode[]>([])
  const nodesRef = useRef<ForceNode[]>([])
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number } | null>(null)
  const animFrameRef = useRef<number>(0)

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const w = Math.max(300, rect.width)
      setSize({ w, h: Math.min(520, Math.max(370, Math.round(w * 0.64))) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Initialize / reset simulation when connections or size change
  useEffect(() => {
    if (!size.w || !size.h) return

    const displayed = connections.slice(0, 14)
    const initial = generateInitialNodes(userId, displayed, size.w, size.h)
    nodesRef.current = initial
    setNodes([...initial])
  }, [userId, connections, size.w, size.h])

  // Physics simulation loop
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current)

    const tick = () => {
      const ns = nodesRef.current
      if (!ns.length) return

      const cx = size.w / 2
      const cy = size.h / 2
      const centerNode = ns[0] // always index 0
      const maxScore = centerNode.score || 1

      for (let i = 0; i < ns.length; i++) {
        const node = ns[i]

        // Skip center node (fixed)
        if (node.isCenter) {
          // Keep center at exact center (optional: could also be draggable, but not requested)
          node.x = cx
          node.y = cy
          node.vx = 0
          node.vy = 0
          continue
        }

        // If this node is being dragged, set position to mouse and skip forces
        if (dragNodeId === node.id) {
          // Position already set via mouse; we only zero out velocity
          node.vx = 0
          node.vy = 0
          continue
        }

        // ── Forces ──
        // Spring attraction toward center
        const dx = cx - node.x
        const dy = cy - node.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const targetDist = 105 + (1 - node.score / maxScore) * 90   // farther for weaker connections
        const springForce = (dist - targetDist) * 0.004              // spring constant
        node.vx += (dx / dist) * springForce
        node.vy += (dy / dist) * springForce

        // Repulsion between all non-center nodes
        for (let j = 1; j < ns.length; j++) {
          if (i === j) continue
          const other = ns[j]
          const ex = node.x - other.x
          const ey = node.y - other.y
          const ed = Math.sqrt(ex * ex + ey * ey) || 0.1
          const minD = node.radius + other.radius + 20

          if (ed < minD) {
            const strength = ((minD - ed) / minD) * 0.08
            const dirX = ex / ed
            const dirY = ey / ed
            node.vx += dirX * strength * minD
            node.vy += dirY * strength * minD
          }
        }

        // Boundary soft containment
        const margin = node.radius + 15
        if (node.x < margin) node.vx += (margin - node.x) * 0.3
        if (node.x > size.w - margin) node.vx -= (node.x - size.w + margin) * 0.3
        if (node.y < margin) node.vy += (margin - node.y) * 0.3
        if (node.y > size.h - margin) node.vy -= (node.y - size.h + margin) * 0.3

        // Damping
        node.vx *= 0.85
        node.vy *= 0.85

        // Integration
        node.x += node.vx
        node.y += node.vy
      }

      // Update React state for re-render
      setNodes([...ns])
      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [dragNodeId, size.w, size.h, userId, connections])


  const handleOutsideClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // If the click is not inside the tooltip panel, unpin
    if (!target.closest('[data-tooltip-panel]')) {
      setPinnedTooltipId(null)
    }
  }

  
  // ── Mouse event handlers for dragging ───
  const handleNodeMouseDown = (e: React.MouseEvent<SVGGElement>, nodeId: string) => {
    if (nodeId === userId) return // don't drag center
    e.preventDefault()
    e.stopPropagation()

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Find the node to get current position
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node) return

    // Record drag start info
    dragRef.current = {
      nodeId,
      startX: node.x - (e.clientX - rect.left),
      startY: node.y - (e.clientY - rect.top),
    }
    setDragNodeId(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragNodeId || !dragRef.current) return
    e.preventDefault()

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Update node position directly (physics tick will see dragNodeId and skip forces)
    const node = nodesRef.current.find(n => n.id === dragNodeId)
    if (node) {
      node.x = mouseX + dragRef.current.startX
      node.y = mouseY + dragRef.current.startY
    }
  }

  const handleMouseUp = () => {
    if (dragNodeId) {
      setDragNodeId(null)
      dragRef.current = null
    }
  }

  const displayed   = connections.slice(0, 14)
  const maxScore    = displayed[0]?.score || 1
  const allProfiles = useMemo(
    () => ({ ...relatedProfiles, [userId]: targetProfile }),
    [relatedProfiles, targetProfile, userId]
  )

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border border-border"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, oklch(0.20 0.04 270 / 0.5) 0%, oklch(0.145 0 0) 70%)",
      }}
    >
      <svg
        width={size.w}
        height={size.h}
        style={{ display: "block", touchAction: "none" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleOutsideClick}
      >
        <defs>
          <radialGradient id="sg-bg" cx="50%" cy="45%" r="55%">
            <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent"          stopOpacity="0"    />
          </radialGradient>
        </defs>
        <rect width={size.w} height={size.h} fill="url(#sg-bg)" />

        {/* ── Edges ── */}
        {displayed.map((conn) => {
          const src = nodes.find(n => n.id === userId)
          const tgt = nodes.find(n => n.id === conn.userId)
          if (!src || !tgt) return null

          const edgeColor = conn.aiClassification
            ? (AI_CLASS_COLORS[conn.aiClassification] || "var(--color-border)")
            : "var(--color-muted-foreground)"

          const activeId = selected
          const isActiveEdge = !activeId || activeId === conn.userId || activeId === userId
          const edgeOpacity  = isActiveEdge ? 0.65 : 0.10
          const thickness    = 1 + (conn.score / maxScore) * 2.8

          const mx  = (src.x + tgt.x) / 2
          const my  = (src.y + tgt.y) / 2
          const len = Math.sqrt((tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2) || 1
          const curvePx = len * 0.08
          const nx  = -(tgt.y - src.y) / len
          const ny  =  (tgt.x - src.x) / len

          return (
            <path
              key={`edge-${conn.userId}`}
              d={`M ${src.x.toFixed(1)} ${src.y.toFixed(1)} Q ${(mx + nx * curvePx).toFixed(1)} ${(my + ny * curvePx).toFixed(1)} ${tgt.x.toFixed(1)} ${tgt.y.toFixed(1)}`}
              fill="none"
              stroke={edgeColor}
              strokeWidth={thickness}
              strokeLinecap="round"
              opacity={edgeOpacity}
            />
          )
        })}

        {/* ── Nodes ── */}
        {nodes.map((node) => {
          const profile      = allProfiles[node.id] || null
          const isHighlighted = selected === node.id || node.isCenter
          const isDimmed      = !!selected && !isHighlighted

          return (
            <NodeCircle
              key={node.id}
              node={node}
              profile={profile}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
              onMouseEnter={(e) => {
                if (node.isCenter) return
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) {
                  setTooltip({ connId: node.id, mx: e.clientX - rect.left, my: e.clientY - rect.top })
                }
                setSelected(node.id)
              }}
              onMouseLeave={() => {
                // Only clear tooltip if it's not pinned for this node
                if (pinnedTooltipId !== node.id) {
                  setTooltip(null)
                  if (!dragNodeId) setSelected(null)
                }
              }}
              onMouseDown={handleNodeMouseDown}
            />
          )
        })}

        {/* ── Node Labels ── */}
        {nodes.map((node) => {
          const profile      = allProfiles[node.id]
          const name         = profile?.global_name || profile?.username || null
          const labelY       = node.y + node.radius + 13
          const isDimmed     = !!selected && selected !== node.id && !node.isCenter
          const textOpacity  = isDimmed ? 0.20 : 1

          return (
            <g key={`lbl-${node.id}`} style={{ pointerEvents: "none", opacity: textOpacity }}>
              {node.isCenter && (
                <text
                  x={node.x} y={node.y - node.radius - 14}
                  textAnchor="middle"
                  fill="var(--color-primary)"
                  fontSize={9}
                  fontWeight="700"
                  letterSpacing="0.08em"
                  style={{ userSelect: "none" }}
                >
                  TARGET
                </text>
              )}
              {name && (
                <text
                  x={node.x} y={labelY}
                  textAnchor="middle"
                  fill="var(--color-foreground)"
                  fontSize={node.isCenter ? 11 : 9}
                  fontWeight={node.isCenter ? "600" : "500"}
                  style={{ userSelect: "none" }}
                >
                  {name.length > 13 ? name.slice(0, 13) + "…" : name}
                </text>
              )}
              <text
                x={node.x}
                y={name ? labelY + 10 : labelY}
                textAnchor="middle"
                fill="var(--color-muted-foreground)"
                fontSize={7}
                opacity={0.65}
                style={{ userSelect: "none" }}
              >
                …{node.id.slice(-8)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* ── Hover Tooltip ── */}
      {(tooltip || pinnedTooltipId) && (() => {
        const activeId = pinnedTooltipId || tooltip?.connId
        const conn    = connections.find((c) => c.userId === activeId)
        if (!conn) return null
        const profile = relatedProfiles[conn.userId]
        const name    = profile?.global_name || profile?.username || null
        const hue     = userIdToHue(conn.userId)
        const classColor = conn.aiClassification
          ? (AI_CLASS_COLORS[conn.aiClassification] || "var(--color-muted-foreground)")
          : "var(--color-muted-foreground)"

        const ttW = 210
        // Determine if we have a valid position from the hover tooltip
        const hasPosition = tooltip !== null && tooltip.connId === activeId
        const ttX = hasPosition
          ? Math.min(tooltip!.mx + 14, size.w - ttW - 6)
          : 20
        const ttY = hasPosition
          ? Math.max(8, tooltip!.my - 70)
          : 20

        return (
          <div
            data-tooltip-panel
            className="absolute z-20 rounded-xl border border-border/80 bg-popover shadow-2xl p-3"
            style={{
              left: ttX,
              top: ttY,
              width: ttW,
              pointerEvents: pinnedTooltipId ? 'auto' : 'none',
            }}
          >
            {/* Close button when pinned */}
            {pinnedTooltipId && (
              <button
                className="absolute top-1.5 right-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setPinnedTooltipId(null)}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            )}

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="h-9 w-9 flex-shrink-0 rounded-full overflow-hidden border border-border"
                style={{ background: `hsl(${hue}, 50%, 22%)` }}
              >
                {profile?.avatar_hash && (
                  <img
                    src={getAvatarUrl(conn.userId, profile.avatar_hash, 64)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                  />
                )}
                {!profile?.avatar_hash && (
                  <div className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">
                    {conn.userId.slice(-2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                {name && <p className="text-xs font-semibold truncate text-foreground">{name}</p>}
                <p className="font-mono text-[10px] text-muted-foreground">…{conn.userId.slice(-10)}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-1.5 border-t border-border pt-2">
              <Row label="Score"    value={conn.score.toFixed(1)}        color="var(--color-chart-1)" />
              <Row label="Messages" value={String(conn.messageInteractions)} />
              {conn.voiceTime > 0 && (
                <Row label="Voice Time" value={formatMs(conn.voiceTime)} />
              )}
              {conn.aiClassification && (
                <Row
                  label="Classification"
                  value={AI_CLASS_LABELS[conn.aiClassification] || conn.aiClassification.replace(/_/g, " ")}
                  color={classColor}
                />
              )}
              {conn.aiConfidence != null && (
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">{Math.round((conn.aiConfidence ?? 0) * 100)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round((conn.aiConfidence ?? 0) * 100)}%`, backgroundColor: classColor }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Legend ── */}
      <div className="absolute bottom-2.5 left-3 flex flex-wrap gap-1.5 max-w-[60%]">
        {Object.entries(AI_CLASS_COLORS)
          .filter(([key]) => connections.some((c) => c.aiClassification === key))
          .map(([key, color]) => (
            <div
              key={key}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-medium border"
              style={{ borderColor: `${color}30`, backgroundColor: `${color}12`, color }}
            >
              <div className="w-3 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {AI_CLASS_LABELS[key] || key.replace(/_/g, " ")}
            </div>
          ))}
      </div>

      {/* ── Node count badge ── */}
      <div className="absolute top-2.5 right-3 text-[10px] text-muted-foreground font-mono">
        {displayed.length} connections
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold" style={{ color: color || "var(--color-foreground)" }}>
        {value}
      </span>
    </div>
  )
}

// ── SocialTab ─────────────────────────────────────────────────────────────────

function SocialTab({ userId }: { userId: string }) {
  const { settings, cacheVersion, targetStatuses } = useSentinel()
  const [analyzing, setAnalyzing]   = useState(false)
  const [viewMode, setViewMode]     = useState<"graph" | "list">("graph")

  const { data, loading, error, refetch } = useApi(
    () => api.getSocialRelationships(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const { data: changes } = useApi(
    () => api.getSocialChanges(userId, 20),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const connectionIds = useMemo(
    () => (data?.connections || []).slice(0, 14).map((c) => c.userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [(data?.connections || []).slice(0, 14).map((c) => c.userId).join(",")]
  )

  const relatedProfiles = useRelatedProfiles(connectionIds, settings.sentinelToken)
  const targetProfile   = targetStatuses[userId]?.profile || null

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      await api.triggerSocialAnalysis(userId)
      setTimeout(() => { refetch(); setAnalyzing(false) }, 3000)
    } catch {
      setAnalyzing(false)
    }
  }

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Users} title="Error" message={error} />
  if (!data || !data.connections?.length) {
    return (
      <EmptyState
        icon={Users}
        message="No social data yet. Needs interaction history to build a graph."
      />
    )
  }

  const connections = data.connections.slice(0, 20)
  const maxScore    = connections[0]?.score || 1

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <StatCard value={data.connections.length}  label="Connections"  color="var(--color-chart-1)" />
        <StatCard value={data.totalInteractions}   label="Interactions" color="var(--color-chart-3)" />
        <StatCard value={data.aiAnalyzedCount ?? 0} label="AI Analyzed" color="var(--color-chart-5)" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 p-1">
          <button
            onClick={() => setViewMode("graph")}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: viewMode === "graph" ? "var(--color-primary)" : "transparent",
              color:           viewMode === "graph" ? "white" : "var(--color-muted-foreground)",
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            Graph
          </button>
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: viewMode === "list" ? "var(--color-primary)" : "transparent",
              color:           viewMode === "list" ? "white" : "var(--color-muted-foreground)",
            }}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyze}
          disabled={analyzing}
          className="h-8 text-xs"
        >
          <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${analyzing ? "animate-pulse" : ""}`} />
          {analyzing ? "Analyzing…" : "Run AI Analysis"}
        </Button>
      </div>

      {viewMode === "graph" && (
        <SocialForceGraph
          userId={userId}
          connections={connections}
          relatedProfiles={relatedProfiles}
          targetProfile={targetProfile}
        />
      )}

      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0 divide-y">
            {connections.map((conn, i) => {
              const profile  = relatedProfiles[conn.userId]
              const name     = profile?.global_name || profile?.username || null
              const hue      = userIdToHue(conn.userId)
              const aiColor  = conn.aiClassification
                ? (AI_CLASS_COLORS[conn.aiClassification] || "var(--color-muted-foreground)")
                : null
              const avatarUrl = profile?.avatar_hash
                ? getAvatarUrl(conn.userId, profile.avatar_hash, 64)
                : null

              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-3 hover:bg-secondary/40 transition-colors"
                  style={{ minHeight: 56 }}
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

                    <div
                      className="h-9 w-9 flex-shrink-0 rounded-full overflow-hidden border border-border"
                      style={{ background: `hsl(${hue}, 50%, 22%)` }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                          {conn.userId.slice(-2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {name && (
                        <p className="text-sm font-semibold truncate leading-tight">{name}</p>
                      )}
                      <DiscordId type="user" id={conn.userId} textSize="text-[10px]" />
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground capitalize">{conn.relationship}</span>
                        {conn.aiClassification && aiColor && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border"
                            style={{ color: aiColor, borderColor: `${aiColor}30`, backgroundColor: `${aiColor}15` }}
                          >
                            {(AI_CLASS_LABELS[conn.aiClassification] || conn.aiClassification).replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      {conn.aiConfidence !== null && conn.aiConfidence !== undefined && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-1 w-16 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(conn.aiConfidence * 100)}%`,
                                backgroundColor: aiColor || "var(--color-chart-1)",
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground">
                            {Math.round((conn.aiConfidence ?? 0) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground flex-shrink-0 ml-2">
                    <p className="font-semibold" style={{ color: "var(--color-chart-1)" }}>
                      {conn.score.toFixed(1)}
                    </p>
                    <p className="hidden sm:block text-[10px]">{conn.messageInteractions}msg</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {changes && changes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Relationship Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {changes.slice(0, 10).map((ch, i) => {
              const profile  = relatedProfiles[ch.other_user_id]
              const name     = profile?.global_name || profile?.username || null
              const hue      = userIdToHue(ch.other_user_id)
              const avatarUrl = profile?.avatar_hash
                ? getAvatarUrl(ch.other_user_id, profile.avatar_hash, 64)
                : null
              const color = AI_CLASS_COLORS[ch.classification] || "var(--color-muted-foreground)"

              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-7 w-7 flex-shrink-0 rounded-full overflow-hidden border border-border"
                      style={{ background: `hsl(${hue}, 50%, 22%)` }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold">
                          {ch.other_user_id.slice(-2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      {name && <p className="text-xs font-medium truncate">{name}</p>}
                      <DiscordId type="user" id={ch.other_user_id} textSize="text-[10px]" />
                    </div>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded flex-shrink-0"
                      style={{ color }}
                    >
                      {(AI_CLASS_LABELS[ch.classification] || ch.classification).replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(ch.recorded_at).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Categories ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  gaming:    "var(--color-chart-1)",
  music:     "var(--color-spotify)",
  emotional: "var(--color-chart-4)",
  humor:     "var(--color-status-idle)",
  planning:  "var(--color-chart-3)",
  question:  "var(--color-chart-5)",
  general:   "var(--color-muted-foreground)",
}

function CategoriesTab({ userId }: { userId: string }) {
  const { settings, cacheVersion } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getCategoryBreakdown(userId),
    [userId, cacheVersion, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Tag} title="Error" message={error} />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="No Categories Yet"
        message="Message categories are computed by AI. Set AI_PROVIDER in your selfbot .env to enable automatic categorization."
      />
    )
  }

  const total   = data.reduce((s, c) => s + c.count, 0)
  const pieData = data.map((c) => ({
    label: c.category,
    value: c.count,
    color: CATEGORY_COLORS[c.category] || "var(--color-muted-foreground)",
  }))
  const barData = data
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((c) => ({
      label: c.category.charAt(0).toUpperCase() + c.category.slice(1),
      value: c.count,
      color: CATEGORY_COLORS[c.category] || "var(--color-muted-foreground)",
    }))

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribution</CardTitle></CardHeader>
          <CardContent>
            <PieChart data={pieData} size={110} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((c) => {
                  const pct   = total > 0 ? (c.count / total) * 100 : 0
                  const color = CATEGORY_COLORS[c.category] || "var(--color-muted-foreground)"
                  return (
                    <div key={c.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize font-medium" style={{ color }}>{c.category}</span>
                        <span className="text-muted-foreground">{c.count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Category Counts</CardTitle></CardHeader>
        <CardContent>
          <BarChart data={barData} />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Baselines ─────────────────────────────────────────────────────────────────

function BaselinesTab({ userId }: { userId: string }) {
  const { settings } = useSentinel()
  const [recomputing, setRecomputing] = useState(false)

  const { data, loading, error, refetch } = useApi(
    () => api.getBaselines(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const handleRecompute = async () => {
    setRecomputing(true)
    try {
      await api.recomputeBaselines(userId)
      setTimeout(() => { refetch(); setRecomputing(false) }, 2000)
    } catch {
      setRecomputing(false)
    }
  }

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={TrendingUp} title="Error" message={error} />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No Baselines Computed"
        message="Behavioral baselines require at least 7 days of data. Click Recompute to trigger computation."
        action={
          <Button size="sm" onClick={handleRecompute} disabled={recomputing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${recomputing ? "animate-spin" : ""}`} />
            {recomputing ? "Computing…" : "Recompute Baselines"}
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data.length} metrics · {data[0]?.data_window_days ?? 30}-day window
        </p>
        <Button size="sm" variant="outline" onClick={handleRecompute} disabled={recomputing} className="h-8 text-xs">
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${recomputing ? "animate-spin" : ""}`} />
          {recomputing ? "Computing…" : "Recompute"}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="divide-y">
          {data.map((b) => (
            <div
              key={b.metric_name}
              className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">{b.metric_name.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-muted-foreground">
                  Computed {new Date(b.computed_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className="text-sm font-semibold" style={{ color: "var(--color-chart-1)" }}>
                  {b.baseline_value.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">±{b.std_deviation.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}