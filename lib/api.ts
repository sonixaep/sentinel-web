/* lib/api.ts */
import type {
  Target,
  SentinelStatus,
  TargetStatus,
  TimelineResponse,
  SentinelEvent,
  AlertRule,
  AlertHistoryItem,
  ProfileSnapshot,
  MessageRecord,
  DailySummary,
  SleepSchedule,
  RoutinePattern,
  Anomaly,
  GamingProfileData,
  MusicProfileData,
  VoiceHabitsData,
  SocialConnection,
  RelationshipAnalysis,
  RelationshipHistory,
  DailyBrief,
  BackfillProgress,
  BaselineMetric,
  TargetConfig,
  MessageCategory,
  EventCorrelation,
} from "./types"

// ── Config ─────────────────────────────────────────────────────────────────────

interface ApiConfig {
  baseUrl: string
  token: string
}

let apiConfig: ApiConfig = { baseUrl: "", token: "" }

export function setApiConfig(baseUrl: string, token: string) {
  apiConfig = { baseUrl: baseUrl.replace(/\/$/, ""), token }
}

export function getApiConfig(): ApiConfig {
  return apiConfig
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validateBaseUrl(url: string): void {
  if (!url) throw new Error("API URL is not configured. Go to Settings.")
  try {
    const u = new URL(url)
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("API URL must use http or https.")
    }
  } catch {
    throw new Error(`Invalid API URL: "${url}"`)
  }
}

// ── Cache ──────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, Promise<unknown>>()

// ── Core request ───────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Only include Content-Type: application/json when the request actually has a
 * body. Fastify rejects requests that declare this header but send an empty
 * body (HTTP 400 FST_ERR_CTP_EMPTY_JSON_BODY). DELETE and bodyless PATCH
 * requests must not set this header.
 */
function getHeaders(hasBody = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiConfig.token}`,
  }
  if (hasBody) {
    headers["Content-Type"] = "application/json"
  }
  return headers
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  cacheTtl = 0
): Promise<T> {
  validateBaseUrl(apiConfig.baseUrl)

  const url      = `${apiConfig.baseUrl}${path}`
  const method   = options.method || "GET"
  const cacheKey = `${method}:${url}`
  const hasBody  = options.body != null

  // Return cached value for GET-like requests
  if (cacheTtl > 0 && method === "GET") {
    const hit = cache.get(cacheKey)
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data as T
    }
  }

  // Deduplicate identical in-flight requests
  const inflight = pendingRequests.get(cacheKey)
  if (inflight) return inflight as Promise<T>

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const promise = (async (): Promise<T> => {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { ...getHeaders(hasBody), ...options.headers },
        // Caller can pass their own signal; we fall back to our timeout signal
        signal: options.signal ?? controller.signal,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`API ${res.status}: ${body.slice(0, 200)}`)
      }

      const text = await res.text()
      let data: T
      try {
        data = JSON.parse(text) as T
      } catch {
        throw new Error(`API returned non-JSON: ${text.slice(0, 200)}`)
      }

      if (cacheTtl > 0 && method === "GET") {
        cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtl })
      }

      return data
    } finally {
      clearTimeout(timeoutId)
      pendingRequests.delete(cacheKey)
    }
  })()

  pendingRequests.set(cacheKey, promise)
  return promise
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const api = {
  // Status
  getStatus: () =>
    request<SentinelStatus>("/api/status", {}, 10_000),

  // Targets
  getTargets: () =>
    request<Target[]>("/api/targets", {}, 5_000),
  addTarget: (userId: string, label?: string, notes?: string, priority?: number) =>
    request<Target>("/api/targets", {
      method: "POST",
      body: JSON.stringify({ userId, label, notes, priority }),
    }),
  removeTarget: (userId: string) =>
    request<{ success: boolean }>(`/api/targets/${userId}`, { method: "DELETE" }),
  updateTarget: (
    userId: string,
    data: { label?: string | null; notes?: string | null; priority?: number; active?: boolean }
  ) =>
    request<Target>(`/api/targets/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Target status
  getTargetStatus: (userId: string) =>
    request<TargetStatus>(`/api/targets/${userId}/status`, {}, 5_000),

  // Events
  getEvents: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<SentinelEvent[]>(`/api/events${qs}`, {}, 5_000)
  },

  // Timeline
  getTimeline: (userId: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<TimelineResponse>(`/api/targets/${userId}/timeline${qs}`, {}, 10_000)
  },
  getTimelineDay: (userId: string, date: string) =>
    request<TimelineResponse>(
      `/api/targets/${userId}/timeline/day/${date}`,
      {},
      30_000
    ),

  // Analytics
  getPresenceAnalytics: (userId: string, days = 30) =>
    request<{
      sessions: { status: string; total_ms: number; count: number }[]
      platformBreakdown: { platform: string; total_ms: number; count: number }[]
      totalActiveMs: number
      days: number
    }>(`/api/targets/${userId}/analytics/presence?days=${days}`, {}, 60_000),

  getActivityAnalytics: (userId: string, days = 90) =>
    request<GamingProfileData>(
      `/api/targets/${userId}/analytics/activities?days=${days}`,
      {},
      60_000
    ),

  getMessageAnalytics: (userId: string, days = 30) =>
    request<{
      totalMessages: number
      avgWordCount: number
      avgMessageLength: number
      vocabularyRichness: number
      editRate: number
      deleteRate: number
      ghostTypeRate: number
      replyRate: number
      messagesByHour: number[]
    }>(`/api/targets/${userId}/analytics/messages?days=${days}`, {}, 60_000),

  getVoiceAnalytics: (userId: string, days = 30) =>
    request<VoiceHabitsData>(
      `/api/targets/${userId}/analytics/voice?days=${days}`,
      {},
      60_000
    ),

  getHeatmap: (userId: string) =>
    request<{ weeklyGrid: { eventCount: number }[][] }>(
      `/api/targets/${userId}/analytics/heatmap`,
      {},
      60_000
    ),

  getDailySummaries: (userId: string, days = 30) =>
    request<DailySummary[]>(
      `/api/targets/${userId}/analytics/daily?days=${days}`,
      {},
      60_000
    ),

  getMusicAnalytics: (userId: string, days = 30) =>
    request<MusicProfileData>(
      `/api/targets/${userId}/analytics/music?days=${days}`,
      {},
      60_000
    ),

  getTypingAnalytics: (userId: string) =>
    request<{ total: number; ghosts: number; ghostRate: number; avgDelayMs: number }>(
      `/api/targets/${userId}/analytics/typing`,
      {},
      30_000
    ),

  // Insights
  getSleepSchedule: (userId: string) =>
    request<SleepSchedule>(
      `/api/targets/${userId}/insights/sleep`,
      {},
      60_000
    ),
  getRoutine: (userId: string) =>
    request<RoutinePattern>(
      `/api/targets/${userId}/insights/routine`,
      {},
      60_000
    ),
  getAvailability: (userId: string) =>
    request<Record<string, unknown>>(
      `/api/targets/${userId}/insights/availability`,
      {},
      60_000
    ),
  getAnomalies: (userId: string) =>
    request<Anomaly[]>(
      `/api/targets/${userId}/insights/anomalies`,
      {},
      30_000
    ),

  // Profile
  getProfileHistory: (userId: string) =>
    request<ProfileSnapshot[]>(
      `/api/targets/${userId}/profile/history`,
      {},
      30_000
    ),
  getCurrentProfile: (userId: string) =>
    request<ProfileSnapshot>(
      `/api/targets/${userId}/profile/current`,
      {},
      10_000
    ),

  // Messages
  getMessages: (userId: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<MessageRecord[]>(`/api/targets/${userId}/messages${qs}`, {}, 10_000)
  },
  getDeletedMessages: (userId: string) =>
    request<MessageRecord[]>(`/api/targets/${userId}/messages/deleted`, {}, 10_000),
  getEditedMessages: (userId: string) =>
    request<MessageRecord[]>(`/api/targets/${userId}/messages/edited`, {}, 10_000),

  // Alerts
  getAlertRules: () =>
    request<AlertRule[]>("/api/alerts/rules", {}, 10_000),
  createAlertRule: (data: {
    targetId?: string
    ruleType: string
    condition?: Record<string, unknown>
    digestMode?: boolean
    fatigueThreshold?: number
    compositeCondition?: Record<string, unknown>
  }) =>
    request<AlertRule>("/api/alerts/rules", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteAlertRule: (id: number) =>
    request<{ success: boolean }>(`/api/alerts/rules/${id}`, { method: "DELETE" }),
  getAlertHistory: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<AlertHistoryItem[]>(`/api/alerts/history${qs}`, {}, 5_000)
  },
  acknowledgeAlert: (id: number) =>
    request<{ success: boolean }>(`/api/alerts/history/${id}/ack`, { method: "PATCH" }),

  // Social graph (AI-enriched)
  getSocialRelationships: (userId: string, days = 30) =>
    request<{ connections: SocialConnection[]; totalInteractions: number; aiAnalyzedCount: number }>(
      `/api/targets/${userId}/social/relationships?days=${days}`,
      {},
      60_000
    ),
  getSocialRelationship: (userId: string, otherId: string) =>
    request<{ analysis: RelationshipAnalysis | null; history: RelationshipHistory[] }>(
      `/api/targets/${userId}/social/relationships/${otherId}`,
      {},
      30_000
    ),
  triggerSocialAnalysis: (userId: string) =>
    request<{ accepted: boolean; message: string }>(
      `/api/targets/${userId}/social/analyze`,
      { method: "POST" }
    ),
  getSocialChanges: (userId: string, limit = 50) =>
    request<RelationshipHistory[]>(
      `/api/targets/${userId}/social/changes?limit=${limit}`,
      {},
      30_000
    ),

  // Daily briefs
  getDailyBriefs: (userId: string, limit = 30) =>
    request<DailyBrief[]>(
      `/api/targets/${userId}/briefs?limit=${limit}`,
      {},
      30_000
    ),
  getDailyBrief: (userId: string, date: string) =>
    request<DailyBrief>(
      `/api/targets/${userId}/briefs/${date}`,
      {},
      30_000
    ),
  generateBrief: (userId: string, date?: string) => {
    const qs = date ? `?date=${date}` : ""
    return request<{ success: boolean; date: string; brief_text: string }>(
      `/api/targets/${userId}/briefs/generate${qs}`,
      { method: "POST" }
    )
  },

  // Backfill
  getBackfillProgress: (userId: string) =>
    request<BackfillProgress>(
      `/api/targets/${userId}/backfill/progress`,
      {},
      15_000
    ),
  startBackfill: (userId: string) =>
    request<{ accepted: boolean; message: string }>(
      `/api/targets/${userId}/backfill/start`,
      { method: "POST" }
    ),
  resetBackfill: (userId: string, mode: "new_channels" | "full_reset") =>
    request<{ accepted: boolean; message: string }>(
      `/api/targets/${userId}/backfill/custom`,
      { method: "POST", body: JSON.stringify({ mode }) }
    ),

  // Baselines
  getBaselines: (userId: string) =>
    request<BaselineMetric[]>(
      `/api/targets/${userId}/analytics/baselines`,
      {},
      60_000
    ),
  recomputeBaselines: (userId: string) =>
    request<{ success: boolean }>(
      `/api/targets/${userId}/analytics/baselines/recompute`,
      { method: "POST" }
    ),

  // Target config
  getTargetConfig: (userId: string) =>
    request<TargetConfig>(
      `/api/targets/${userId}/config`,
      {},
      30_000
    ),
  updateTargetConfig: (userId: string, cfg: Partial<Omit<TargetConfig, "target_id" | "updated_at">>) =>
    request<{ success: boolean }>(
      `/api/targets/${userId}/config`,
      { method: "PATCH", body: JSON.stringify(cfg) }
    ),

  // Category breakdown
  getCategoryBreakdown: (userId: string) =>
    request<MessageCategory[]>(
      `/api/targets/${userId}/analytics/categories`,
      {},
      60_000
    ),

  // Correlations
  getCorrelations: (userId: string, days = 30, windowHours = 0.5) =>
    request<EventCorrelation[]>(
      `/api/targets/${userId}/insights/correlations?days=${days}&window_hours=${windowHours}`,
      {},
      60_000
    ),

  // Timeline range
  getTimelineRange: (userId: string, from: string, to: string) =>
    request<{
      presenceSessions: unknown[]
      activitySessions: unknown[]
      voiceSessions: unknown[]
      eventCount: number
      dateRange: { from: string; to: string; days: number }
    }>(
      `/api/targets/${userId}/timeline/range?from=${from}&to=${to}`,
      {},
      30_000
    ),

  // Alert webhook test
  testAlertWebhook: () =>
    request<{ success: boolean }>("/api/alerts/test", { method: "POST" }),

  // Suppressed alerts
  getSuppressedAlerts: () =>
    request<AlertRule[]>("/api/alerts/rules/suppressed", {}, 10_000),
  unsuppressAlertRule: (id: number) =>
    request<{ success: boolean }>(`/api/alerts/rules/${id}/unsuppress`, { method: "POST" }),
  toggleAlertRule: (id: number, enabled: boolean) =>
    request<{ success: boolean }>(`/api/alerts/rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),

  // Export
  exportData: (userId: string) =>
    request<Record<string, unknown>>(`/api/export/${userId}`),

  // Cache management
  clearCache:              () => cache.clear(),
  clearCacheForTarget:     (userId: string) => {
    for (const key of cache.keys()) {
      if (key.includes(userId)) cache.delete(key)
    }
  },
}