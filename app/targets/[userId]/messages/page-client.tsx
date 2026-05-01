/* app/targets/[userId]/messages/page.tsx */
"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { DiscordId } from "@/components/ui/discord-id"
import { useApi, useDebounce } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatDateTime } from "@/lib/utils"
import { MessageSquare, Search, Trash2, Edit, Ghost, Tag } from "lucide-react"

const MESSAGE_CATEGORIES = ["gaming", "music", "emotional", "humor", "planning", "question", "general"] as const

export default function MessagesPage() {
  const params = useParams()
  const userId = params.userId as string
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")

  return (
    <Tabs defaultValue="all">
      <TabsList className="mb-6">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="deleted">Deleted</TabsTrigger>
        <TabsTrigger value="edited">Edited</TabsTrigger>
        <TabsTrigger value="ghosts">Ghost Typed</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-md border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Categories</option>
              {MESSAGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <AllMessages userId={userId} search={search} category={category} />
      </TabsContent>
      <TabsContent value="deleted"><DeletedMessages userId={userId} /></TabsContent>
      <TabsContent value="edited"><EditedMessages userId={userId} /></TabsContent>
      <TabsContent value="ghosts"><GhostTyping userId={userId} /></TabsContent>
    </Tabs>
  )
}

function AllMessages({ userId, search, category }: { userId: string; search: string; category: string }) {
  const { settings } = useSentinel()
  const debouncedSearch = useDebounce(search, 300)

  const params: Record<string, string> = { limit: "100" }
  if (debouncedSearch) params.search   = debouncedSearch
  if (category)        params.category = category

  const { data, loading, error } = useApi(
    () => api.getMessages(userId, params),
    [userId, debouncedSearch, category, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={MessageSquare} title="Error" message={error} />
  if (!data || data.length === 0) return <EmptyState icon={MessageSquare} message="No messages found" />

  return (
    <Card>
      <CardContent className="p-0 divide-y max-h-[600px] overflow-y-auto">
        {data.map((msg) => (
          <MessageItem key={msg.message_id} msg={msg} />
        ))}
      </CardContent>
    </Card>
  )
}

function DeletedMessages({ userId }: { userId: string }) {
  const { settings } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getDeletedMessages(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Trash2} title="Error" message={error} />
  if (!data || data.length === 0) return <EmptyState icon={Trash2} message="No deleted messages found" />

  return (
    <Card>
      <CardContent className="p-0 divide-y max-h-[600px] overflow-y-auto">
        {data.map((msg) => (
          <MessageItem key={msg.message_id} msg={msg} deleted />
        ))}
      </CardContent>
    </Card>
  )
}

function EditedMessages({ userId }: { userId: string }) {
  const { settings } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getEditedMessages(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Edit} title="Error" message={error} />
  if (!data || data.length === 0) return <EmptyState icon={Edit} message="No edited messages found" />

  return (
    <Card>
      <CardContent className="p-0 divide-y max-h-[600px] overflow-y-auto">
        {data.map((msg) => (
          <MessageItem key={msg.message_id} msg={msg} showEditHistory />
        ))}
      </CardContent>
    </Card>
  )
}

function GhostTyping({ userId }: { userId: string }) {
  const { settings } = useSentinel()
  const { data, loading, error } = useApi(
    () => api.getTypingAnalytics(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={Ghost} title="Error" message={error} />
  if (!data)   return <EmptyState icon={Ghost} message="No typing data" />

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-secondary/50 p-4 text-center">
            <p className="text-2xl font-bold text-chart-4">{data.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Typing</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{data.ghosts || 0}</p>
            <p className="text-xs text-muted-foreground">Ghost Types</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4 text-center">
            <p className="text-2xl font-bold text-chart-3">
              {data.total > 0 ? `${Math.round(data.ghostRate * 100)}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Ghost Rate</p>
          </div>
        </div>
        {data.avgDelayMs > 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Average typing-to-message delay: {(data.avgDelayMs / 1000).toFixed(1)}s
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface MessageItemProps {
  msg: {
    message_id: string
    content: string | null
    channel_id: string
    guild_id: string | null
    created_at: number
    deleted_at?: number | null
    edited_at?: number | null
    edit_history?: string | null
    attachment_count: number
    word_count: number
    is_reply: number
  }
  deleted?: boolean
  showEditHistory?: boolean
}

function MessageItem({ msg, deleted, showEditHistory }: MessageItemProps) {
  const content = msg.content || "[No content]"
  const ts = msg.created_at || msg.deleted_at || msg.edited_at

  let editHistory: string[] = []
  if (showEditHistory && msg.edit_history) {
    try { editHistory = JSON.parse(msg.edit_history) } catch { /* ignore */ }
  }

  const discordUrl = msg.guild_id
    ? `https://discord.com/channels/${msg.guild_id}/${msg.channel_id}`
    : `https://discord.com/channels/@me/${msg.channel_id}`

  return (
    <div className="flex gap-4 px-4 py-3 hover:bg-secondary/30">
      <div
        className="h-full w-0.5 self-stretch rounded-full min-h-[40px]"
        style={{
          backgroundColor: deleted
            ? "var(--color-destructive)"
            : showEditHistory
              ? "var(--color-chart-3)"
              : "var(--color-border)",
        }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm break-words ${deleted ? "text-destructive line-through" : ""}`}>
          {content}
        </p>

        {editHistory.length > 0 && (
          <div className="mt-2 space-y-1">
            {editHistory.map((old, i) => (
              <p key={i} className="text-xs text-muted-foreground line-through">
                {old}
              </p>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          {/* Full channel ID with link */}
          <DiscordId
            type="channel"
            id={msg.channel_id}
            guildId={msg.guild_id || undefined}
            textSize="text-[10px]"
          />
          {msg.attachment_count > 0 && <span>{msg.attachment_count} attachments</span>}
          {msg.word_count > 0 && <span>{msg.word_count} words</span>}
          {msg.is_reply > 0 && <span>reply</span>}
          {deleted && msg.deleted_at && <span>Deleted {formatDateTime(msg.deleted_at)}</span>}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {formatDateTime(ts || 0)}
      </span>
    </div>
  )
}