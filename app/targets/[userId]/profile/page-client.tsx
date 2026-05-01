/* app/targets/[userId]/profile/page.tsx */
"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { DiscordId } from "@/components/ui/discord-id"
import { useApi } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatDateTime, getAvatarUrl, getBannerUrl, userIdToHue } from "@/lib/utils"
import type { ProfileSnapshot } from "@/lib/types"
import { User, LinkIcon, ExternalLink } from "lucide-react"

export default function ProfilePage() {
  const params = useParams()
  const userId = params.userId as string
  const { settings } = useSentinel()

  const { data, loading, error } = useApi(
    () => api.getProfileHistory(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error)   return <EmptyState icon={User} title="Error" message={error} />
  if (!data || data.length === 0) return <EmptyState icon={User} message="No profile history" />

  const currentProfile = data[0]

  // Build "changed" snapshots only (where something differs from the previous one)
  const changedSnapshots: { snapshot: ProfileSnapshot; prev: ProfileSnapshot; changes: string[] }[] = []
  for (let i = 0; i < data.length - 1; i++) {
    const snap = data[i]
    const prev = data[i + 1]
    const changes = detectChanges(snap, prev)
    if (changes.length > 0) {
      changedSnapshots.push({ snapshot: snap, prev, changes })
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Current Profile (Discord-style card) ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Profile</h2>
        <CurrentProfileCard snapshot={currentProfile} userId={userId} />
      </div>

      {/* ── Snapshot History (horizontal scrollable) ── */}
      {changedSnapshots.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Snapshot History ({changedSnapshots.length} changes)
          </h2>
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
          >
            {changedSnapshots.map(({ snapshot, changes }, i) => (
              <SnapshotCard key={i} snapshot={snapshot} changes={changes} userId={userId} />
            ))}
          </div>
        </div>
      )}

      {/* ── Avatar History ── */}
      {data.some((s) => s.avatar_hash) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Avatar History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
            >
              {data
                .filter((snap) => snap.avatar_hash)
                .filter((snap, i, arr) => arr.findIndex((s) => s.avatar_hash === snap.avatar_hash) === i)
                .slice(0, 24)
                .map((snap, i) => (
                  <a
                    key={i}
                    href={getAvatarUrl(userId, snap.avatar_hash, 512)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex-shrink-0 text-center"
                  >
                    <div className="relative">
                      <img
                        src={getAvatarUrl(userId, snap.avatar_hash, 128)}
                        alt=""
                        className="h-14 w-14 rounded-full border-2 border-border object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <p className="mt-1 text-[9px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(snap.timestamp)}
                    </p>
                  </a>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── User ID ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Discord User ID</span>
            <DiscordId type="user" id={userId} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function detectChanges(snap: ProfileSnapshot, prev: ProfileSnapshot): string[] {
  const changes: string[] = []
  if (prev.username      !== snap.username      && snap.username)      changes.push("Username")
  if (prev.global_name   !== snap.global_name)                         changes.push("Display Name")
  if (prev.avatar_hash   !== snap.avatar_hash)                         changes.push("Avatar")
  if (prev.banner_hash   !== snap.banner_hash   && snap.banner_hash)   changes.push("Banner")
  if (prev.bio           !== snap.bio)                                  changes.push("Bio")
  if (prev.pronouns      !== snap.pronouns)                             changes.push("Pronouns")
  if (prev.discriminator !== snap.discriminator && snap.discriminator)  changes.push("Discriminator")
  // Connected accounts diff
  if (prev.connected_accounts !== snap.connected_accounts) {
    try {
      const oldAccs = JSON.parse(prev.connected_accounts || "[]") as { type: string }[]
      const newAccs = JSON.parse(snap.connected_accounts || "[]") as { type: string }[]
      const oldTypes = new Set(oldAccs.map((a) => a.type))
      const newTypes = new Set(newAccs.map((a) => a.type))
      for (const t of newTypes) { if (!oldTypes.has(t)) changes.push(`+${t}`) }
      for (const t of oldTypes) { if (!newTypes.has(t)) changes.push(`-${t}`) }
    } catch { /* ignore */ }
  }
  return changes
}

// ── BioDisplay ─────────────────────────────────────────────────────────────────

function BioDisplay({ bio, maxLen = 120 }: { bio: string; maxLen?: number }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = bio.length > maxLen

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p
        className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed"
      >
        {isLong && !expanded ? bio.slice(0, maxLen) + "…" : bio}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  )
}

// ── ConnectedAccountsBadges ────────────────────────────────────────────────────

function ConnectedAccountsBadges({ json }: { json: string }) {
  try {
    const accounts = JSON.parse(json) as { type: string; name: string; verified?: boolean }[]
    if (!accounts?.length) return null
    return (
      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Connected
        </p>
        <div className="flex flex-wrap gap-1.5">
          {accounts.map((acc, i) => (
            <div
              key={i}
              className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs border border-border"
            >
              <span className="font-medium capitalize text-muted-foreground">{acc.type}</span>
              <span className="text-foreground">{acc.name}</span>
              {acc.verified && (
                <span className="text-[9px] text-status-online">✓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  } catch {
    return null
  }
}

// ── CurrentProfileCard ─────────────────────────────────────────────────────────

function CurrentProfileCard({ snapshot, userId }: { snapshot: ProfileSnapshot; userId: string }) {
  const bannerUrl = getBannerUrl(userId, snapshot.banner_hash)
  const avatarUrl = getAvatarUrl(userId, snapshot.avatar_hash, 256)
  const hue       = userIdToHue(userId)
  const accentHex = snapshot.accent_color
    ? `#${snapshot.accent_color.toString(16).padStart(6, "0")}`
    : null

  const backgroundStyle = bannerUrl
    ? undefined
    : accentHex
      ? { background: `linear-gradient(135deg, ${accentHex}dd, ${accentHex}66)` }
      : { background: `linear-gradient(135deg, hsl(${hue},60%,30%) 0%, hsl(${(hue + 40) % 360},70%,40%) 100%)` }

  return (
    <Card className="overflow-hidden max-w-md">
      {/* Banner */}
      <div className="relative h-[120px] w-full" style={backgroundStyle}>
        {bannerUrl && (
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
        {/* Avatar overlapping banner */}
        <div className="absolute -bottom-10 left-4">
          <div
            className="rounded-full border-4 border-card overflow-hidden bg-secondary"
            style={{ width: 80, height: 80 }}
          >
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.currentTarget
                t.style.display = "none"
              }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <CardContent className="pt-12 px-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight truncate">
              {snapshot.global_name || snapshot.username || userId}
            </h3>
            {snapshot.global_name && snapshot.username && (
              <p className="text-sm text-muted-foreground truncate">{snapshot.username}</p>
            )}
            {snapshot.pronouns && (
              <p className="text-xs text-muted-foreground mt-0.5">{snapshot.pronouns}</p>
            )}
          </div>
        </div>

        {snapshot.bio && <BioDisplay bio={snapshot.bio} maxLen={200} />}

        {snapshot.connected_accounts && (
          <ConnectedAccountsBadges json={snapshot.connected_accounts} />
        )}

        <p className="mt-3 text-[10px] text-muted-foreground">
          Snapshot captured {formatDateTime(snapshot.timestamp)}
        </p>
      </CardContent>
    </Card>
  )
}

// ── SnapshotCard (for history strip) ──────────────────────────────────────────

function SnapshotCard({
  snapshot,
  changes,
  userId,
}: {
  snapshot: ProfileSnapshot
  changes: string[]
  userId: string
}) {
  const [bioExpanded, setBioExpanded] = useState(false)
  const bannerUrl = getBannerUrl(userId, snapshot.banner_hash)
  const avatarUrl = getAvatarUrl(userId, snapshot.avatar_hash, 128)
  const hue       = userIdToHue(userId)
  const accentHex = snapshot.accent_color
    ? `#${snapshot.accent_color.toString(16).padStart(6, "0")}`
    : null

  const backgroundStyle = bannerUrl
    ? undefined
    : accentHex
      ? { background: `linear-gradient(135deg, ${accentHex}dd, ${accentHex}66)` }
      : { background: `linear-gradient(135deg, hsl(${hue},60%,30%) 0%, hsl(${(hue + 40) % 360},70%,40%) 100%)` }

  const bioText = snapshot.bio || ""
  const BIO_MAX = 80

  return (
    <div
      className="flex-shrink-0 rounded-xl overflow-hidden border border-border bg-card"
      style={{ width: 220 }}
    >
      {/* Mini banner */}
      <div className="relative h-14" style={backgroundStyle}>
        {bannerUrl && (
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
        {/* Mini avatar */}
        <div className="absolute -bottom-5 left-3">
          <div
            className="rounded-full border-2 border-card overflow-hidden bg-secondary"
            style={{ width: 40, height: 40 }}
          >
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-7 px-3 pb-3">
        <p className="text-xs font-semibold truncate leading-tight">
          {snapshot.global_name || snapshot.username || userId}
        </p>
        {snapshot.pronouns && (
          <p className="text-[10px] text-muted-foreground truncate">{snapshot.pronouns}</p>
        )}

        {bioText && (
          <div className="mt-1.5">
            <p
              className={`text-[10px] text-muted-foreground whitespace-pre-wrap ${bioText.length > BIO_MAX ? "cursor-pointer" : ""}`}
              onClick={() => bioText.length > BIO_MAX && setBioExpanded((v) => !v)}
              title={bioText.length > BIO_MAX ? (bioExpanded ? "Click to collapse" : "Click to expand") : undefined}
            >
              {bioExpanded || bioText.length <= BIO_MAX
                ? bioText
                : bioText.slice(0, BIO_MAX) + "…"}
            </p>
          </div>
        )}

        {/* Change badges */}
        <div className="mt-2 flex flex-wrap gap-1">
          {changes.map((c) => (
            <span
              key={c}
              className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary border border-primary/20"
            >
              {c}
            </span>
          ))}
        </div>

        <p className="mt-2 text-[9px] text-muted-foreground">{formatDateTime(snapshot.timestamp)}</p>
      </div>
    </div>
  )
}