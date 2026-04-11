"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Avatar } from "@/components/ui/avatar"
import { formatRelative, parseEventData } from "@/lib/utils"
import { EVENT_COLORS, EVENT_LABELS, STATUS_COLORS, type SSEEvent, type TargetStatus } from "@/lib/types"
import {
  Activity, ExternalLink, Gamepad2, Mic, Music, MessageSquare,
  Trash2, Edit, Ghost, UserCircle, Radio, LogIn, LogOut,
  ArrowRight, Volume2,
} from "lucide-react"

interface LiveFeedProps {
  events: SSEEvent[]
  targetStatuses?: Record<string, TargetStatus>
  maxEvents?: number
}

export function LiveFeed({ events, targetStatuses = {}, maxEvents = 50 }: LiveFeedProps) {
  const displayEvents = events
    .filter((e) => e && typeof e.timestamp !== "undefined")
    .slice(0, maxEvents)

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="border-b pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-online opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-online" />
            </span>
            Live Feed
          </CardTitle>
          <span className="text-xs text-muted-foreground">{displayEvents.length} events</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 max-h-[600px] overflow-y-auto p-0">
        {displayEvents.length === 0 ? (
          <EmptyState
            icon={Activity}
            message="Events will appear here in real-time as they occur."
            className="py-8"
          />
        ) : (
          <div className="divide-y">
            {displayEvents.map((event, i) => (
              <EventItem
                key={`${event.target_id}-${event.event_type}-${event.timestamp}-${i}`}
                event={event}
                targetStatuses={targetStatuses}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.offline
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border"
      style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

// ── Rich detail renderers ──────────────────────────────────────────────────────

function buildDiscordUrl(d: Record<string, unknown>, event: SSEEvent): string | null {
  const channelId = (d.channelId ?? d.channel_id ?? (event as unknown as Record<string, unknown>).channel_id) as string | undefined
  if (!channelId) return null
  const guildId = (d.guildId ?? d.guild_id ?? (event as unknown as Record<string, unknown>).guild_id) as string | undefined
  return guildId
    ? `https://discord.com/channels/${guildId}/${channelId}`
    : `https://discord.com/channels/@me/${channelId}`
}

interface RichDetail {
  text: string | null
  subText?: string | null
  icon?: React.ReactNode
  pills?: React.ReactNode
  discordUrl?: string | null
}

function extractRichDetail(event: SSEEvent, d: Record<string, unknown>): RichDetail {
  switch (event.event_type) {

    case "PRESENCE_UPDATE":
    case "INITIAL_PRESENCE": {
      const oldS = d.oldStatus as string | undefined
      const newS = d.newStatus as string | undefined
      const platform = d.platform as string | undefined
      return {
        text: null,
        pills: (
          <span className="inline-flex items-center gap-1">
            {oldS && <><StatusPill status={oldS} /><ArrowRight className="h-2.5 w-2.5 text-muted-foreground" /></>}
            {newS && <StatusPill status={newS} />}
            {platform && <span className="text-[9px] text-muted-foreground ml-1">({platform})</span>}
          </span>
        ),
        icon: <Radio className="h-3 w-3" />,
      }
    }

    case "ACTIVITY_START":
    case "INITIAL_ACTIVITY": {
      const name = d.name as string | undefined
      const details = d.details as string | undefined
      const state = d.state as string | undefined
      return {
        text: name || "Unknown activity",
        subText: [details, state].filter(Boolean).join(" · ") || null,
        icon: <Gamepad2 className="h-3 w-3" />,
      }
    }

    case "ACTIVITY_END": {
      const name = d.name as string | undefined
      return { text: name ? `Stopped ${name}` : "Stopped activity", icon: <Gamepad2 className="h-3 w-3" /> }
    }

    case "SPOTIFY_START": {
      const song = d.song as string | undefined
      const artist = d.artist as string | undefined
      const album = d.album as string | undefined
      return {
        text: song || "Unknown track",
        subText: [artist && `by ${artist}`, album && `— ${album}`].filter(Boolean).join(" ") || null,
        icon: <Music className="h-3 w-3" />,
      }
    }

    case "SPOTIFY_END": {
      const song = d.song as string | undefined
      return { text: song ? `Stopped: ${song}` : "Stopped listening", icon: <Music className="h-3 w-3" /> }
    }

    case "MESSAGE_CREATE": {
      const content = d.content as string | undefined
      const chId = (d.channelId ?? d.channel_id) as string | undefined
      const guildId = (d.guildId ?? d.guild_id) as string | undefined
      const preview = content ? (content.length > 80 ? content.slice(0, 80) + "…" : content) : null
      return {
        text: preview || "Sent a message",
        subText: chId ? `in #…${chId.slice(-8)}${guildId ? "" : " (DM)"}` : null,
        icon: <MessageSquare className="h-3 w-3" />,
        discordUrl: buildDiscordUrl(d, event),
      }
    }

    case "MESSAGE_UPDATE": {
      const newContent = (d.newContent ?? d.content) as string | undefined
      const chId = (d.channelId ?? d.channel_id) as string | undefined
      const preview = newContent ? (newContent.length > 60 ? newContent.slice(0, 60) + "…" : newContent) : null
      return {
        text: preview || "Edited a message",
        subText: chId ? `in #…${chId.slice(-8)}` : null,
        icon: <Edit className="h-3 w-3" />,
        discordUrl: buildDiscordUrl(d, event),
      }
    }

    case "MESSAGE_DELETE": {
      const content = d.content as string | undefined
      const chId = (d.channelId ?? d.channel_id) as string | undefined
      const preview = content ? (content.length > 60 ? content.slice(0, 60) + "…" : content) : null
      return {
        text: preview || "Deleted a message",
        subText: chId ? `in #…${chId.slice(-8)}` : null,
        icon: <Trash2 className="h-3 w-3" />,
        discordUrl: buildDiscordUrl(d, event),
      }
    }

    case "VOICE_JOIN": {
      const chId = (d.channelId ?? d.channel_id) as string | undefined
      const chName = d.channelName as string | undefined
      return {
        text: chName ? `Joined #${chName}` : chId ? `Joined …${chId.slice(-10)}` : "Joined voice",
        icon: <Mic className="h-3 w-3" />,
        discordUrl: buildDiscordUrl(d, event),
      }
    }

    case "VOICE_LEAVE": {
      const chName = d.channelName as string | undefined
      const chId = (d.channelId ?? d.channel_id) as string | undefined
      return {
        text: chName ? `Left #${chName}` : chId ? `Left …${chId.slice(-10)}` : "Left voice",
        icon: <Mic className="h-3 w-3" />,
      }
    }

    case "VOICE_MOVE": {
      const from = d.fromChannel as string | undefined
      const to = d.toChannel as string | undefined
      const fromName = d.fromChannelName as string | undefined
      const toName = d.toChannelName as string | undefined
      return {
        text: `${fromName || (from ? `…${from.slice(-6)}` : "?")} → ${toName || (to ? `…${to.slice(-6)}` : "?")}`,
        icon: <Volume2 className="h-3 w-3" />,
      }
    }

    case "VOICE_STATE_CHANGE": {
      const changes: string[] = []
      if (d.selfMute !== undefined) changes.push(d.selfMute ? "Muted" : "Unmuted")
      if (d.selfDeaf !== undefined) changes.push(d.selfDeaf ? "Deafened" : "Undeafened")
      if (d.streaming !== undefined) changes.push(d.streaming ? "Started streaming" : "Stopped streaming")
      return { text: changes.join(", ") || "Voice state changed", icon: <Mic className="h-3 w-3" /> }
    }

    case "GHOST_TYPE": {
      const chId = (d.channelId ?? d.channel_id) as string | undefined
      const chName = d.channelName as string | undefined
      return {
        text: `Started typing, never sent`,
        subText: chName ? `in #${chName}` : chId ? `in #…${chId.slice(-8)}` : null,
        icon: <Ghost className="h-3 w-3" />,
        discordUrl: buildDiscordUrl(d, event),
      }
    }

    case "PROFILE_UPDATE": {
      const changes = d.changes as string[] | undefined
      return {
        text: changes?.length ? changes.slice(0, 3).join(", ") + (changes.length > 3 ? ` +${changes.length - 3}` : "") : "Profile updated",
        icon: <UserCircle className="h-3 w-3" />,
      }
    }

    case "AVATAR_CHANGE":
      return { text: "Changed their avatar", icon: <UserCircle className="h-3 w-3" /> }

    case "USERNAME_CHANGE": {
      const oldV = d.old as string | undefined
      const newV = d.new as string | undefined
      return {
        text: oldV && newV ? `${oldV} → ${newV}` : "Changed username",
        icon: <UserCircle className="h-3 w-3" />,
      }
    }

    case "NICKNAME_CHANGE": {
      const oldNick = d.oldNick as string | undefined
      const newNick = d.newNick as string | undefined
      return {
        text: newNick ? (oldNick ? `${oldNick} → ${newNick}` : `Set to ${newNick}`) : "Removed nickname",
        icon: <UserCircle className="h-3 w-3" />,
      }
    }

    case "SERVER_JOIN": {
      const guildId = (d.guildId ?? d.guild_id) as string | undefined
      const guildName = d.guildName as string | undefined
      return {
        text: guildName ? `Joined ${guildName}` : guildId ? `Joined …${guildId.slice(-8)}` : "Joined a server",
        icon: <LogIn className="h-3 w-3" />,
      }
    }

    case "SERVER_LEAVE": {
      const guildName = d.guildName as string | undefined
      return { text: guildName ? `Left ${guildName}` : "Left a server", icon: <LogOut className="h-3 w-3" /> }
    }

    case "ACCOUNT_CONNECTED":
    case "ACCOUNT_DISCONNECTED": {
      const acType = d.type as string | undefined
      const name = d.name as string | undefined
      return {
        text: acType && name ? `${acType}: ${name}` : acType || "Account changed",
        icon: <ExternalLink className="h-3 w-3" />,
      }
    }

    case "REACTION_ADD": {
      const emoji = d.emoji as string | undefined
      const chId = (d.channelId ?? d.channel_id) as string | undefined
      return {
        text: emoji ? `Reacted with ${emoji}` : "Added a reaction",
        subText: chId ? `in #…${chId.slice(-8)}` : null,
        icon: <Activity className="h-3 w-3" />,
        discordUrl: buildDiscordUrl(d, event),
      }
    }

    case "CUSTOM_STATUS_SET": {
      const text = (d.text ?? d.state) as string | undefined
      const emoji = d.emoji as string | undefined
      return {
        text: [emoji, text].filter(Boolean).join(" ") || "Set custom status",
        icon: <Activity className="h-3 w-3" />,
      }
    }

    case "STREAMING_START": {
      const name = d.name as string | undefined
      return { text: name ? `Streaming ${name}` : "Started streaming", icon: <Activity className="h-3 w-3" /> }
    }

    default: {
      // Fallback: extract whatever useful field exists
      const text =
        (d.newStatus ? `${d.oldStatus ?? "?"} → ${d.newStatus}` : null) ||
        (d.name ? String(d.name) : null) ||
        (d.song ? `${d.song}${d.artist ? ` – ${d.artist}` : ""}` : null) ||
        (d.content ? String(d.content).slice(0, 80) : null) ||
        null
      return { text, icon: <Activity className="h-3 w-3" /> }
    }
  }
}

// ── Event item ─────────────────────────────────────────────────────────────────

function EventItem({
  event,
  targetStatuses,
}: {
  event: SSEEvent
  targetStatuses: Record<string, TargetStatus>
}) {
  const color    = EVENT_COLORS[event.event_type] || "var(--color-muted-foreground)"
  const label    = EVENT_LABELS[event.event_type] || event.event_type
  const targetId = event.target_id ?? "unknown"

  const profile = targetStatuses[targetId]?.profile
  const currentStatus = targetStatuses[targetId]?.presence?.status || "offline"
  const avatarHash = targetStatuses[targetId]?.profile?.avatar_hash
  const displayName = profile?.global_name || profile?.username || `…${targetId.slice(-6)}`

  let rich: RichDetail = { text: null }
  let discordUrl: string | null = null

  try {
    const raw = event.data
    const d: Record<string, unknown> = typeof raw === "string" ? parseEventData(raw) : (raw ?? {})
    rich = extractRichDetail(event, d)
    discordUrl = rich.discordUrl ?? buildDiscordUrl(d, event)
  } catch { /* ignore */ }

  return (
    <Link
      href={`/targets/${targetId}`}
      className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-secondary/40"
      style={{ minHeight: 52 }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <Avatar
          userId={targetId}
          avatarHash={avatarHash}
          size={30}
          status={currentStatus as "online" | "idle" | "dnd" | "offline"}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Row 1: name + event badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground truncate max-w-[90px]">
            {displayName}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border"
            style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}
          >
            {rich.icon && <span style={{ color }}>{rich.icon}</span>}
            {label}
          </span>
        </div>

        {/* Row 2: pills (for status changes) */}
        {rich.pills && (
          <div className="mt-0.5">{rich.pills}</div>
        )}

        {/* Row 3: main text detail */}
        {rich.text && (
          <p
            className="mt-0.5 truncate text-[11px] leading-tight"
            style={{ color: "var(--color-foreground)", opacity: 0.85 }}
          >
            {rich.text}
          </p>
        )}

        {/* Row 4: sub-text (channel, artist, etc.) */}
        {rich.subText && (
          <p className="truncate text-[10px] text-muted-foreground leading-tight">
            {rich.subText}
          </p>
        )}
      </div>

      {/* Right: timestamp + Discord link */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {event.timestamp ? formatRelative(event.timestamp) : ""}
        </span>
        {discordUrl && (
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Open in Discord"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </Link>
  )
}