/* lib/context.tsx */
"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { api, setApiConfig, getApiConfig } from "./api"
import type { SSEEvent, SentinelStatus, Target, TargetStatus } from "./types"

// ── Settings ───────────────────────────────────────────────────────────────────

interface Settings {
  sentinelUrl: string
  sentinelToken: string
  dashboardRefreshInterval: number
  enableSSE: boolean
  showDesktopNotifications: boolean
}

const INITIAL_SETTINGS: Settings = {
  sentinelUrl:               "http://localhost:48923",
  sentinelToken:             "",
  dashboardRefreshInterval:  30,
  enableSSE:                 true,
  showDesktopNotifications:  true,
}

// ── Context ────────────────────────────────────────────────────────────────────

interface SentinelContextValue {
  settings:        Settings
  updateSettings:  (newSettings: Partial<Settings>) => void
  connected:       boolean
  status:          SentinelStatus | null
  recentEvents:    SSEEvent[]
  cacheVersion:    number
  targets:         Target[]
  targetStatuses:  Record<string, TargetStatus>
  refreshTargets:  () => Promise<void>
  addTarget:       (userId: string, label?: string) => Promise<void>
  removeTarget:    (userId: string) => Promise<void>
  updateTarget:    (userId: string, data: { label?: string; notes?: string; priority?: number; active?: boolean }) => Promise<void>
  isLoading:       boolean
  error:           string | null
}

const SentinelContext = createContext<SentinelContextValue | null>(null)

// ── localStorage helpers ───────────────────────────────────────────────────────

const LS_KEYS = {
  url:      "sentinel_url",
  token:    "sentinel_token",
  interval: "sentinel_refresh_interval",
  sse:      "sentinel_sse",
  notifs:   "sentinel_notifications",
} as const

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* ignore */ }
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function SentinelProvider({ children }: { children: ReactNode }) {
  const [settings,       setSettings]       = useState<Settings>(INITIAL_SETTINGS)
  const [hydrated,       setHydrated]       = useState(false)
  const [connected,      setConnected]      = useState(false)
  const [status,         setStatus]         = useState<SentinelStatus | null>(null)
  const [recentEvents,   setRecentEvents]   = useState<SSEEvent[]>([])
  const [cacheVersion,   setCacheVersion]   = useState(0)
  const [targets,        setTargets]        = useState<Target[]>([])
  const [targetStatuses, setTargetStatuses] = useState<Record<string, TargetStatus>>({})
  const [isLoading,      setIsLoading]      = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const cacheDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Hydrate settings from localStorage ─────────────────────────────────────
  useEffect(() => {
    const savedUrl      = lsGet(LS_KEYS.url)
    const savedToken    = lsGet(LS_KEYS.token)
    const savedInterval = lsGet(LS_KEYS.interval)
    const savedSSE      = lsGet(LS_KEYS.sse)
    const savedNotifs   = lsGet(LS_KEYS.notifs)

    const updates: Partial<Settings> = {}
    if (savedUrl)                  updates.sentinelUrl = savedUrl
    if (savedToken)                updates.sentinelToken = savedToken
    if (savedInterval) {
      const parsed = parseInt(savedInterval, 10)
      if (!isNaN(parsed) && parsed >= 5 && parsed <= 300) {
        updates.dashboardRefreshInterval = parsed
      }
    }
    if (savedSSE   !== null) updates.enableSSE                = savedSSE === "true"
    if (savedNotifs !== null) updates.showDesktopNotifications = savedNotifs === "true"

    if (Object.keys(updates).length > 0) {
      setSettings((s) => ({ ...s, ...updates }))
    }
    setHydrated(true)
  }, [])

  // ── Keep API config in sync ─────────────────────────────────────────────────
  useEffect(() => {
    setApiConfig(settings.sentinelUrl, settings.sentinelToken)
  }, [settings.sentinelUrl, settings.sentinelToken])

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      if (newSettings.sentinelUrl               !== undefined) lsSet(LS_KEYS.url,      newSettings.sentinelUrl)
      if (newSettings.sentinelToken             !== undefined) lsSet(LS_KEYS.token,    newSettings.sentinelToken)
      if (newSettings.dashboardRefreshInterval  !== undefined) lsSet(LS_KEYS.interval, String(newSettings.dashboardRefreshInterval))
      if (newSettings.enableSSE                 !== undefined) lsSet(LS_KEYS.sse,      String(newSettings.enableSSE))
      if (newSettings.showDesktopNotifications  !== undefined) lsSet(LS_KEYS.notifs,   String(newSettings.showDesktopNotifications))
      return updated
    })
  }, [])

  // ── Target fetch helpers ────────────────────────────────────────────────────
  const refreshTargets = useCallback(async () => {
    if (!settings.sentinelToken) return
    try {
      const targetList = await api.getTargets()
      setTargets(targetList)

      const results = await Promise.allSettled(
        targetList.map((t) => api.getTargetStatus(t.user_id))
      )

      const statuses: Record<string, TargetStatus> = {}
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          statuses[targetList[i].user_id] = result.value
        }
      })
      setTargetStatuses(statuses)
    } catch (e) {
      console.error("Failed to fetch targets:", e)
    }
  }, [settings.sentinelToken])

  const addTarget = useCallback(
    async (userId: string, label?: string) => {
      await api.addTarget(userId, label)
      api.clearCache()
      await refreshTargets()
    },
    [refreshTargets]
  )

  const removeTarget = useCallback(
    async (userId: string) => {
      await api.removeTarget(userId)
      api.clearCache()
      await refreshTargets()
    },
    [refreshTargets]
  )

  const updateTarget = useCallback(
    async (
      userId: string,
      data: { label?: string; notes?: string; priority?: number; active?: boolean }
    ) => {
      await api.updateTarget(userId, data)
      api.clearCacheForTarget(userId)
      await refreshTargets()
    },
    [refreshTargets]
  )

  // ── Initial connection + periodic status check ─────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    if (!settings.sentinelToken) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const checkConnection = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const statusData = await api.getStatus()
        if (cancelled) return
        setStatus(statusData)
        setConnected(true)
        await refreshTargets()
      } catch (e) {
        if (cancelled) return
        setConnected(false)
        setError(e instanceof Error ? e.message : "Connection failed")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    checkConnection()

    const statusInterval = setInterval(async () => {
      if (cancelled) return
      try {
        const statusData = await api.getStatus()
        if (cancelled) return
        setStatus(statusData)
        setConnected(true)
      } catch {
        if (!cancelled) setConnected(false)
      }
    }, 30_000)

    return () => {
      cancelled = true
      clearInterval(statusInterval)
    }
  }, [hydrated, settings.sentinelToken, refreshTargets])

  // ── Periodic target-status refresh ─────────────────────────────────────────
  useEffect(() => {
    if (!connected || targets.length === 0) return

    const interval = setInterval(async () => {
      const results = await Promise.allSettled(
        targets.map((t) => api.getTargetStatus(t.user_id))
      )
      const statuses: Record<string, TargetStatus> = {}
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          statuses[targets[i].user_id] = result.value
        }
      })
      setTargetStatuses(statuses)
    }, settings.dashboardRefreshInterval * 1_000)

    return () => clearInterval(interval)
  }, [connected, targets, settings.dashboardRefreshInterval])

  // ── SSE live event stream ───────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.enableSSE || !settings.sentinelToken || !connected) return

    const { baseUrl, token } = getApiConfig()
    if (!baseUrl || !token) return

    const url = `${baseUrl}/api/events/stream`
    let abortController: AbortController | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let reconnectDelay = 1_000
    const MAX_RECONNECT_DELAY = 30_000
    let stopped = false

    const connect = async () => {
      if (stopped) return
      try {
        abortController = new AbortController()

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal:  abortController.signal,
          cache:   "no-store",
        })

        if (!response.ok || !response.body) {
          throw new Error(`SSE connection failed: ${response.status}`)
        }

        reconnectDelay = 1_000

        const reader  = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer    = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            try {
              const raw = JSON.parse(line.slice(6))
              if (raw?.type === "connected") continue

              const data = raw as SSEEvent

              setRecentEvents((prev) => {
                // Deduplication: skip if same type+target within 500ms
                const isDuplicate = prev.some(
                  (e) =>
                    e.event_type === data.event_type &&
                    e.target_id === data.target_id &&
                    Math.abs(e.timestamp - data.timestamp) < 500
                )
                if (isDuplicate) return prev
                return [data, ...prev].slice(0, 100)
              })

              if (cacheDebounceRef.current) clearTimeout(cacheDebounceRef.current)
              cacheDebounceRef.current = setTimeout(() => {
                if (data.target_id) api.clearCacheForTarget(data.target_id)
                setCacheVersion((v) => v + 1)
              }, 4_000)
            } catch {
              // Ignore malformed payloads
            }
          }
        }
      } catch (e) {
        if (stopped) return
        if ((e as Error).name === "AbortError") return

        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
        console.warn(`SSE disconnected, reconnecting in ${reconnectDelay}ms`)
        reconnectTimeout = setTimeout(connect, reconnectDelay)
      }
    }

    connect()

    return () => {
      stopped = true
      if (abortController)          abortController.abort()
      if (reconnectTimeout)         clearTimeout(reconnectTimeout)
      if (cacheDebounceRef.current) clearTimeout(cacheDebounceRef.current)
    }
  }, [settings.enableSSE, settings.sentinelToken, connected])

  return (
    <SentinelContext.Provider
      value={{
        settings,
        updateSettings,
        connected,
        status,
        recentEvents,
        cacheVersion,
        targets,
        targetStatuses,
        refreshTargets,
        addTarget,
        removeTarget,
        updateTarget,
        isLoading,
        error,
      }}
    >
      {children}
    </SentinelContext.Provider>
  )
}

export function useSentinel() {
  const context = useContext(SentinelContext)
  if (!context) throw new Error("useSentinel must be used within a SentinelProvider")
  return context
}