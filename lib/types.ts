/* lib/types.ts */

export interface Target {
  user_id: string
  added_at: number
  label: string | null
  notes: string | null
  priority: number
  active: number
}

export interface SentinelEvent {
  id: number
  target_id: string
  event_type: string
  timestamp: number
  data: string
  guild_id: string | null
  channel_id: string | null
}

export interface ProfileSnapshot {
  id: number
  target_id: string
  timestamp: number
  username: string | null
  global_name: string | null
  discriminator: string | null
  avatar_hash: string | null
  banner_hash: string | null
  bio: string | null
  pronouns: string | null
  accent_color: number | null
  connected_accounts: string | null
  mutual_guilds: string | null
}

export interface PresenceSession {
  id: number
  target_id: string
  status: string
  platform: string | null
  start_time: number
  end_time: number | null
  duration_ms: number | null
}

export interface ActivitySession {
  id: number
  target_id: string
  activity_name: string
  activity_type: number
  application_id: string | null
  details: string | null
  state: string | null
  start_time: number
  end_time: number | null
  duration_ms: number | null
  metadata: string | null
}

export interface VoiceSession {
  id: number
  target_id: string
  guild_id: string
  channel_id: string
  channel_name: string | null
  start_time: number
  end_time: number | null
  duration_ms: number | null
  self_mute: number
  self_deaf: number
  streaming: number
  co_participants: string | null
}

export interface MessageRecord {
  message_id: string
  target_id: string
  channel_id: string
  guild_id: string | null
  content: string | null
  content_length: number
  attachment_count: number
  embed_count: number
  is_reply: number
  reply_to_user_id: string | null
  created_at: number
  edited_at: number | null
  deleted_at: number | null
  edit_history: string | null
  word_count: number
  emoji_count: number
  mention_count: number
  link_count: number
}

export interface DailySummary {
  target_id: string
  date: string
  online_minutes: number
  idle_minutes: number
  dnd_minutes: number
  offline_minutes: number
  /**
   * Computed by the backend: online_minutes + idle_minutes + dnd_minutes.
   * Use this for "total active" rather than online_minutes alone — idle and
   * DND both mean the user is present.
   */
  total_active_minutes: number
  message_count: number
  edit_count: number
  delete_count: number
  ghost_type_count: number
  voice_minutes: number
  activity_minutes: string
  reaction_count: number
  first_seen: number | null
  last_seen: number | null
  peak_hour: number | null
}

export interface AlertRule {
  id: number
  target_id: string | null
  rule_type: string
  condition: string
  enabled: number
  created_at: number
  fire_count_24h: number
  auto_suppressed: number
  fatigue_threshold: number
  digest_mode: number
  composite_condition: string | null
}

export interface RelationshipAnalysis {
  id: number
  target_id: string
  other_user_id: string
  classification: string
  confidence: number
  reasoning: string[]
  analyzed_at: number
  data_window_start: number
  data_window_end: number
}

export interface RelationshipHistory {
  id: number
  target_id: string
  other_user_id: string
  classification: string
  confidence: number
  recorded_at: number
}

export interface DailyBrief {
  id: number
  target_id: string
  date: string
  brief_text: string
  generated_at: number
}

export interface BackfillChannelRow {
  id: number
  target_id: string
  guild_id: string
  channel_id: string
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped" | "paused"
  messages_found: number
  oldest_message_id: string | null
  started_at: number | null
  completed_at: number | null
  error: string | null
}

export interface BackfillProgress {
  summary: {
    total: number
    pending: number
    in_progress: number
    completed: number
    failed: number
    skipped: number
    paused: number
    totalMessagesFound: number
  }
  channels: BackfillChannelRow[]
}

export interface BaselineMetric {
  id: number
  target_id: string
  metric_name: string
  baseline_value: number
  std_deviation: number
  computed_at: number
  data_window_days: number
}

export interface TargetConfig {
  target_id: string
  social_weight_messages: number
  social_weight_reactions: number
  social_weight_voice_hours: number
  social_weight_mentions: number
  anomaly_z_threshold: number
  updated_at?: number
}

export interface MessageCategory {
  message_id: string
  target_id: string
  category: string
  count: number
}

export interface EventCorrelation {
  triggerType: string
  followType: string
  occurrences: number
  avgDelayMs: number
  lift: number
  confidence: number
}

export interface AlertHistoryItem {
  id: number
  rule_id: number
  target_id: string
  alert_type: string
  message: string
  timestamp: number
  acknowledged: number
}

export interface TargetStatus {
  target: Target | null
  presence: { status: string; platform: string | null; clientStatus: Record<string, unknown> } | null
  activities: { name: string; type: number; details?: string; state?: string }[]
  voiceState: {
    guildId: string
    channelId: string
    selfMute: boolean
    selfDeaf: boolean
    streaming: boolean
  } | null
  profile: ProfileSnapshot | null
}

export interface SentinelStatus {
  uptime: number
  uptimeFormatted: string
  eventCount: number
  targetCount: number
  activeTargets: number
  dbSizeBytes: number
  dbSizeMB: number
  startedAt: number
}

export interface TimelineResponse {
  events: SentinelEvent[]
  presenceSessions: PresenceSession[]
  activitySessions: ActivitySession[]
  voiceSessions: VoiceSession[]
}

export interface SleepSchedule {
  estimatedBedtime: string | null
  estimatedWakeTime: string | null
  avgSleepDurationHours: number | null
  weekdayBedtime: string | null
  weekendBedtime: string | null
  weekdayWakeTime: string | null
  weekendWakeTime: string | null
  irregularities: string[]
  confidence: number
  dataPoints: number
}

export interface RoutinePattern {
  weeklyGrid: {
    dayOfWeek: number
    hour: number
    eventCount: number
    dominantType: string | null
    isTypical: boolean
  }[][]
  summary: string[]
  anomalies: string[]
}

export interface SocialConnection {
  userId: string
  score: number
  messageInteractions: number
  reactionInteractions: number
  voiceTime: number
  mentionCount: number
  relationship: string
  aiClassification: string | null
  aiConfidence: number | null
  aiReasoning: string[]
  analyzedAt: number | null
}

export interface Anomaly {
  type: string
  severity: "low" | "medium" | "high"
  description: string
  timestamp: number
}

export interface GamingProfileData {
  games: {
    name: string
    totalPlaytimeMs: number
    sessionCount: number
    avgSessionMs: number
    firstPlayed: number
    lastPlayed: number
    peakHour: number
    peakDay: number
  }[]
  totalGamingMs: number
  peakGamingHour: number | null
  recentlyStarted: string[]
  abandoned: string[]
}

export interface MusicProfileData {
  topArtists: { name: string; listens: number; totalMs: number }[]
  topSongs: { name: string; artist: string; listens: number }[]
  totalListeningMs: number
  listeningByHour: number[]
  sessionCount: number
  recentTrack: { song: string; artist: string; album: string } | null
}

export interface VoiceHabitsData {
  totalVoiceMs: number
  sessionCount: number
  avgSessionMs: number
  byHour: number[]
  byDay: number[]
  preferredChannels: { channelId: string; guildId: string; totalMs: number; sessions: number }[]
  muteRatio: number
  deafRatio: number
  streamingMs: number
  topPartners: { userId: string; sharedMs: number }[]
}

// ── SSE ────────────────────────────────────────────────────────────────────────
// Single canonical definition — do not redeclare in other files.
export interface SSEEvent {
  target_id: string
  event_type: string
  timestamp: number
  data: Record<string, unknown>
}

// ── UI types ───────────────────────────────────────────────────────────────────
export type PresenceStatus = "online" | "idle" | "dnd" | "offline" | "invisible"
export type TabId = "dashboard" | "target"
export type TargetTab =
  | "overview"
  | "timeline"
  | "analytics"
  | "profile"
  | "insights"
  | "messages"
  | "alerts"
export type AnalyticsSubTab =
  | "presence"
  | "activities"
  | "messages"
  | "voice"
  | "music"
  | "social"

// ── Event styling ──────────────────────────────────────────────────────────────
export const EVENT_COLORS: Record<string, string> = {
  PRESENCE_UPDATE:      "var(--color-status-online)",
  INITIAL_PRESENCE:     "var(--color-chart-5)",
  PLATFORM_SWITCH:      "var(--color-chart-1)",
  ACTIVITY_START:       "var(--color-chart-1)",
  ACTIVITY_END:         "var(--color-status-offline)",
  SPOTIFY_START:        "var(--color-spotify)",
  SPOTIFY_END:          "var(--color-status-offline)",
  STREAMING_START:      "var(--color-chart-4)",
  STREAMING_END:        "var(--color-status-offline)",
  CUSTOM_STATUS_SET:    "var(--color-chart-4)",
  CUSTOM_STATUS_CLEARED:"var(--color-status-offline)",
  MESSAGE_CREATE:       "var(--color-chart-3)",
  MESSAGE_UPDATE:       "var(--color-destructive)",
  MESSAGE_DELETE:       "var(--color-destructive)",
  TYPING_START:         "var(--color-chart-4)",
  GHOST_TYPE:           "var(--color-chart-4)",
  VOICE_JOIN:           "var(--color-status-online)",
  VOICE_LEAVE:          "var(--color-destructive)",
  VOICE_MOVE:           "var(--color-chart-3)",
  VOICE_STATE_CHANGE:   "var(--color-chart-1)",
  PROFILE_UPDATE:       "var(--color-chart-4)",
  AVATAR_CHANGE:        "var(--color-chart-4)",
  USERNAME_CHANGE:      "var(--color-chart-4)",
  NICKNAME_CHANGE:      "var(--color-chart-1)",
  ROLE_ADD:             "var(--color-status-online)",
  ROLE_REMOVE:          "var(--color-destructive)",
  REACTION_ADD:         "var(--color-chart-3)",
  REACTION_REMOVE:      "var(--color-status-offline)",
  SERVER_JOIN:          "var(--color-status-online)",
  SERVER_LEAVE:         "var(--color-destructive)",
  ACCOUNT_CONNECTED:    "var(--color-status-online)",
  ACCOUNT_DISCONNECTED: "var(--color-destructive)",
  DM_CHANNEL_OPENED:    "var(--color-chart-4)",
  ALERT:                "var(--color-destructive)",
}

export const EVENT_LABELS: Record<string, string> = {
  PRESENCE_UPDATE:      "Status Change",
  INITIAL_PRESENCE:     "Initial Status",
  PLATFORM_SWITCH:      "Platform Switch",
  ACTIVITY_START:       "Started Activity",
  ACTIVITY_END:         "Ended Activity",
  SPOTIFY_START:        "Spotify Playing",
  SPOTIFY_END:          "Spotify Stopped",
  STREAMING_START:      "Started Streaming",
  STREAMING_END:        "Stopped Streaming",
  CUSTOM_STATUS_SET:    "Custom Status",
  CUSTOM_STATUS_CLEARED:"Status Cleared",
  MESSAGE_CREATE:       "Sent Message",
  MESSAGE_UPDATE:       "Edited Message",
  MESSAGE_DELETE:       "Deleted Message",
  TYPING_START:         "Typing",
  GHOST_TYPE:           "Ghost Typed",
  VOICE_JOIN:           "Joined Voice",
  VOICE_LEAVE:          "Left Voice",
  VOICE_MOVE:           "Moved Channel",
  VOICE_STATE_CHANGE:   "Voice State",
  PROFILE_UPDATE:       "Profile Update",
  AVATAR_CHANGE:        "Avatar Changed",
  USERNAME_CHANGE:      "Username Changed",
  NICKNAME_CHANGE:      "Nickname Changed",
  ROLE_ADD:             "Role Added",
  ROLE_REMOVE:          "Role Removed",
  REACTION_ADD:         "Reacted",
  REACTION_REMOVE:      "Un-reacted",
  SERVER_JOIN:          "Joined Server",
  SERVER_LEAVE:         "Left Server",
  ACCOUNT_CONNECTED:    "Account Linked",
  ACCOUNT_DISCONNECTED: "Account Unlinked",
  DM_CHANNEL_OPENED:    "DM Opened",
  ALERT:                "Alert",
}

export const STATUS_COLORS: Record<string, string> = {
  online:    "var(--color-status-online)",
  idle:      "var(--color-status-idle)",
  dnd:       "var(--color-status-dnd)",
  offline:   "var(--color-status-offline)",
  invisible: "var(--color-status-offline)",
}

export const ALERT_TYPES = [
  "COMES_ONLINE",
  "GOES_OFFLINE",
  "STARTS_ACTIVITY",
  "STOPS_ACTIVITY",
  "JOINS_VOICE",
  "LEAVES_VOICE",
  "SENDS_MESSAGE",
  "DELETES_MESSAGE",
  "GHOST_TYPES",
  "STATUS_CHANGE",
  "PROFILE_CHANGE",
  "UNUSUAL_HOUR",
  "NEW_GAME",
  "KEYWORD_MENTION",
] as const