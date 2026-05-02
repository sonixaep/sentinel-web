/* app/targets/[userId]/alerts/page.tsx */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { Switch } from "@/components/ui/switch"
import { useApi, useTargetUserId } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { ALERT_TYPES } from "@/lib/types"
import { formatDateTime } from "@/lib/utils"
import { Bell, Plus, Trash2, Check, Volume2, VolumeX } from "lucide-react"

export default function TargetAlertsPage() {
  const userId = useTargetUserId()
  const { settings } = useSentinel()
  const [newType, setNewType] = useState<string>("COMES_ONLINE")
  const [digestMode, setDigestMode] = useState(false)
  const [fatigueThreshold, setFatigueThreshold] = useState(20)

  // All rules — filter client-side to those scoped to this target or global
  const { data: allRules, loading: rulesLoading, refetch: refetchRules } = useApi(
    () => api.getAlertRules(),
    [settings.sentinelToken],
    !!settings.sentinelToken
  )

  // History scoped to this target
  const { data: history, loading: historyLoading, refetch: refetchHistory } = useApi(
    () => api.getAlertHistory({ targetId: userId, limit: "50" }),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  // Show rules that are either for this specific target or are global (no target_id)
  const rules = (allRules || []).filter(
    (r) => r.target_id === userId || r.target_id === null
  )

  const handleCreate = async () => {
    await api.createAlertRule({
      targetId: userId,
      ruleType: newType,
      digestMode,
      fatigueThreshold,
    })
    refetchRules()
  }

  const handleDelete = async (id: number) => {
    await api.deleteAlertRule(id)
    refetchRules()
  }

  const handleAck = async (id: number) => {
    await api.acknowledgeAlert(id)
    refetchHistory()
  }

  const handleUnsuppress = async (id: number) => {
    await api.unsuppressAlertRule(id)
    refetchRules()
  }

  return (
    <Tabs defaultValue="rules">
      <TabsList className="mb-5">
        <TabsTrigger value="rules">Rules</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="rules">
        {/* Create rule card — pre-scoped to this target */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Alert Rule for This Target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="flex-1 h-10 rounded-md border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {ALERT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
              <Button onClick={handleCreate} className="h-10">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <Switch
                  checked={digestMode}
                  onChange={(e) => setDigestMode((e.target as HTMLInputElement).checked)}
                />
                <span>Digest mode</span>
                <span className="text-muted-foreground">(batch alerts)</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Fatigue threshold:</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={fatigueThreshold}
                  onChange={(e) => setFatigueThreshold(parseInt(e.target.value) || 20)}
                  className="w-16 h-7 rounded border bg-input px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-muted-foreground">fires/24h</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {rulesLoading ? (
          <Spinner />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Alert Rules"
            message="Create your first alert rule to get notified about this target's activity."
          />
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <AlertRuleCard
                key={rule.id}
                rule={rule}
                onDelete={handleDelete}
                onUnsuppress={handleUnsuppress}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        {historyLoading ? (
          <Spinner />
        ) : !history || history.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Alert History"
            message="Alert events for this target will appear here when triggered."
          />
        ) : (
          <div className="space-y-2">
            {history.map((alert) => (
              <Card
                key={alert.id}
                className={`transition-opacity ${alert.acknowledged ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3 p-4" style={{ minHeight: 56 }}>
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      alert.acknowledged ? "bg-status-online/10" : "bg-destructive/10"
                    }`}
                  >
                    {alert.acknowledged
                      ? <Check className="h-4 w-4 text-status-online" />
                      : <Bell  className="h-4 w-4 text-destructive"   />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(alert.timestamp)}
                    </p>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAck(alert.id)}
                      className="flex-shrink-0 h-9 px-3"
                    >
                      Ack
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

function AlertRuleCard({
  rule,
  onDelete,
  onUnsuppress,
}: {
  rule: import("@/lib/types").AlertRule
  onDelete: (id: number) => void
  onUnsuppress: (id: number) => void
}) {
  const isSuppressed = rule.auto_suppressed === 1
  const isGlobal     = rule.target_id === null
  const borderColor  = isSuppressed ? "var(--color-status-idle)" : undefined

  return (
    <Card style={borderColor ? { borderColor: `${borderColor}40` } : undefined}>
      <div className="flex items-center justify-between p-4 gap-3" style={{ minHeight: 56 }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: isSuppressed ? "var(--color-status-idle)10" : "var(--color-destructive)10" }}
          >
            {isSuppressed
              ? <VolumeX className="h-4 w-4" style={{ color: "var(--color-status-idle)" }} />
              : <Bell     className="h-4 w-4 text-destructive" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={isSuppressed ? "warning" : "destructive"}>
                {rule.rule_type.replace(/_/g, " ")}
              </Badge>
              {isSuppressed && (
                <Badge variant="warning" className="text-[9px]">Auto-suppressed</Badge>
              )}
              {isGlobal && (
                <span className="text-[9px] px-1.5 py-0.5 rounded border text-muted-foreground border-border">
                  Global
                </span>
              )}
              {rule.digest_mode === 1 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded border text-muted-foreground border-border">
                  Digest
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {(rule.fire_count_24h ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {rule.fire_count_24h} fires today
                </span>
              )}
              {(rule.fatigue_threshold ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  threshold: {rule.fatigue_threshold}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isSuppressed && (
            <button
              onClick={() => onUnsuppress(rule.id)}
              className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-status-idle hover:bg-status-idle/10 transition-colors"
              title="Unsuppress"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Unsuppress</span>
            </button>
          )}
          <button
            onClick={() => onDelete(rule.id)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Delete rule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}
