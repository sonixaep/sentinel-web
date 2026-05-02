/* app/targets/[userId]/insights/page.tsx */
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { Heatmap } from "@/components/charts/heatmap"
import { useApi, useTargetUserId } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatDate } from "@/lib/utils"
import { Brain, Moon, Calendar, AlertTriangle, GitBranch } from "lucide-react"

export default function InsightsPage() {
  const userId = useTargetUserId()

  return (
    <Tabs defaultValue="overview">
      <div
        className="overflow-x-auto mb-6 -mx-3 px-3 md:mx-0 md:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        <TabsList className="inline-flex min-w-max md:flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sleep">Sleep</TabsTrigger>
          <TabsTrigger value="routine">Routine</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">
        <div className="space-y-6">
          <SleepScheduleCard userId={userId} compact />
          <AnomaliesCard userId={userId} limit={5} />
        </div>
      </TabsContent>
      <TabsContent value="sleep"><SleepScheduleCard userId={userId} /></TabsContent>
      <TabsContent value="routine"><RoutineCard userId={userId} /></TabsContent>
      <TabsContent value="anomalies"><AnomaliesCard userId={userId} /></TabsContent>
      <TabsContent value="correlations"><CorrelationsTab userId={userId} /></TabsContent>
    </Tabs>
  )
}

function SleepScheduleCard({ userId, compact }: { userId: string; compact?: boolean }) {
  const { settings } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getSleepSchedule(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error) return <EmptyState icon={Moon} title="Error" message={error} />
  if (!data || !data.estimatedBedtime) return <EmptyState icon={Moon} message="Not enough data to estimate sleep schedule" />

  const bedHour = parseFloat(data.estimatedBedtime.split(":")[0]) + parseFloat(data.estimatedBedtime.split(":")[1]) / 60
  const wakeHour = parseFloat(data.estimatedWakeTime?.split(":")[0] || "8") + parseFloat(data.estimatedWakeTime?.split(":")[1] || "0") / 60

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Moon className="h-4 w-4" />
          Sleep Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Clock visualization */}
          <svg width={compact ? 80 : 120} height={compact ? 80 : 120} viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="55" fill="var(--color-secondary)" stroke="var(--color-border)" strokeWidth="2" />
            {Array.from({ length: 24 }, (_, i) => {
              const angle = (i / 24) * Math.PI * 2 - Math.PI / 2
              const inner = 44
              const outer = 50
              return (
                <line
                  key={i}
                  x1={60 + Math.cos(angle) * inner}
                  y1={60 + Math.sin(angle) * inner}
                  x2={60 + Math.cos(angle) * outer}
                  y2={60 + Math.sin(angle) * outer}
                  stroke={i % 6 === 0 ? "var(--color-muted-foreground)" : "var(--color-border)"}
                  strokeWidth={i % 6 === 0 ? 2 : 1}
                />
              )
            })}
            {/* Sleep arc */}
            {(() => {
              const startAngle = (bedHour / 24) * Math.PI * 2 - Math.PI / 2
              const endAngle = (wakeHour / 24) * Math.PI * 2 - Math.PI / 2
              const r = 38
              const largeArc = (wakeHour < bedHour ? (24 - bedHour + wakeHour) : (wakeHour - bedHour)) > 12 ? 1 : 0
              const x1 = 60 + Math.cos(startAngle) * r
              const y1 = 60 + Math.sin(startAngle) * r
              const x2 = 60 + Math.cos(endAngle) * r
              const y2 = 60 + Math.sin(endAngle) * r
              return (
                <path
                  d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--color-chart-1)"
                  strokeWidth="8"
                  opacity="0.5"
                  strokeLinecap="round"
                />
              )
            })()}
            {[0, 6, 12, 18].map((h) => {
              const angle = (h / 24) * Math.PI * 2 - Math.PI / 2
              const x = 60 + Math.cos(angle) * 32
              const y = 60 + Math.sin(angle) * 32
              return (
                <text key={h} x={x} y={y + 3} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="8">
                  {h === 0 ? "0" : h}
                </text>
              )
            })}
          </svg>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bedtime</p>
              <p className="text-xl font-semibold">{data.estimatedBedtime}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wake Time</p>
              <p className="text-xl font-semibold">{data.estimatedWakeTime}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Sleep</p>
              <p className="text-lg font-medium">{data.avgSleepDurationHours}h</p>
            </div>
          </div>
        </div>

        {!compact && (
          <>
            <div className="my-4 h-px bg-border" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] text-muted-foreground">Weekday Bed</p>
                <p className="font-medium">{data.weekdayBedtime || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Weekend Bed</p>
                <p className="font-medium">{data.weekendBedtime || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Weekday Wake</p>
                <p className="font-medium">{data.weekdayWakeTime || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Weekend Wake</p>
                <p className="font-medium">{data.weekendWakeTime || "N/A"}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Confidence: {data.confidence}% ({data.dataPoints} data points)
            </p>
            {data.irregularities?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium">Irregularities</p>
                {data.irregularities.map((ir, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{ir}</p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RoutineCard({ userId }: { userId: string }) {
  const { settings } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getRoutine(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error) return <EmptyState icon={Calendar} title="Error" message={error} />
  if (!data) return <EmptyState icon={Calendar} message="No routine data" />

  const heatmapData = data.weeklyGrid ? data.weeklyGrid.map((row) => row.map((b) => b.eventCount)) : []

  return (
    <div className="space-y-6">
      {heatmapData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Weekly Activity Pattern</CardTitle></CardHeader>
          <CardContent><Heatmap data={heatmapData} /></CardContent>
        </Card>
      )}
      {data.summary?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Routine Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.summary.map((line, i) => (
              <div key={i} className="border-l-2 border-primary pl-3 text-sm">{line}</div>
            ))}
          </CardContent>
        </Card>
      )}
      {data.anomalies?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Current Anomalies</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.anomalies.map((a, i) => (
              <Badge key={i} variant="warning">{a}</Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AnomaliesCard({ userId, limit }: { userId: string; limit?: number }) {
  const { settings } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getAnomalies(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error) return <EmptyState icon={AlertTriangle} title="Error" message={error} />
  if (!data || data.length === 0) return <EmptyState icon={AlertTriangle} message="No anomalies detected" />

  const anomalies = limit ? data.slice(0, limit) : data

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Anomalies ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {anomalies.map((a, i) => {
          const severityColor = a.severity === "high" ? "text-destructive" : a.severity === "medium" ? "text-chart-3" : "text-status-idle"
          return (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/50 px-3 py-2">
              <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${severityColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={a.severity === "high" ? "destructive" : a.severity === "medium" ? "warning" : "secondary"}>
                    {a.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{a.type}</span>
                </div>
                <p className="mt-1 text-sm">{a.description}</p>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(a.timestamp)}</span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Correlations ──────────────────────────────────────────────────────────────

function CorrelationsTab({ userId }: { userId: string }) {
  const { settings } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getCorrelations(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={GitBranch} title="Error" message={error} />

  // Filter out any malformed entries from the API before rendering
  const validData = (data ?? []).filter(
    (c) =>
      c != null &&
      typeof c.triggerType === "string" &&
      typeof c.followType === "string" &&
      typeof c.occurrences === "number" &&
      typeof c.avgDelayMs === "number" &&
      typeof c.lift === "number" &&
      typeof c.confidence === "number"
  )

  if (validData.length === 0) return (
    <EmptyState
      icon={GitBranch}
      title="No Correlations Detected"
      message="Correlations are detected when two event types consistently follow each other within a short time window. Needs more data."
    />
  )

  return (
    <div className="space-y-3">
      {validData.map((corr, i) => {
        const lift       = corr.lift ?? 0
        const confidence = corr.confidence ?? 0
        const avgDelayMs = corr.avgDelayMs ?? 0
        const triggerType = corr.triggerType ?? "unknown"
        const followType  = corr.followType  ?? "unknown"

        const liftColor = lift >= 3
          ? "var(--color-status-online)"
          : lift >= 1.5
            ? "var(--color-status-idle)"
            : "var(--color-muted-foreground)"

        const delayMin = avgDelayMs / 60_000
        const delayLabel = delayMin < 1
          ? `${Math.round(avgDelayMs / 1000)}s`
          : `${delayMin.toFixed(1)}m`

        return (
          <Card key={i}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    When{" "}
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-secondary text-foreground">
                      {triggerType.replace(/_/g, " ")}
                    </span>{" "}
                    happens,{" "}
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-secondary text-foreground">
                      {followType.replace(/_/g, " ")}
                    </span>{" "}
                    follows {corr.occurrences}× within ~{delayLabel}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className="text-sm font-bold"
                    style={{ color: liftColor }}
                  >
                    {lift.toFixed(1)}×
                  </span>
                  <span className="text-[10px] text-muted-foreground">lift</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-1 w-20 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(confidence * 100)}%`,
                        backgroundColor: liftColor,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(confidence * 100)}% confidence
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  avg {delayLabel} delay
                </span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}