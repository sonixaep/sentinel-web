"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface DiscordIdProps {
  type: "user" | "channel" | "guild"
  id: string
  guildId?: string
  className?: string
  showLink?: boolean
  textSize?: string
}

export function DiscordId({
  type,
  id,
  guildId,
  className,
  showLink = true,
  textSize = "text-xs",
}: DiscordIdProps) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const getUrl = () => {
    switch (type) {
      case "user":    return `https://discord.com/users/${id}`
      case "channel": return `https://discord.com/channels/${guildId || "@me"}/${id}`
      case "guild":   return `https://discord.com/channels/${id}`
    }
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={cn("font-mono text-muted-foreground", textSize)}>{id}</span>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 transition-opacity duration-100",
          hovered ? "opacity-100" : "opacity-0"
        )}
      >
        <button
          type="button"
          onClick={handleCopy}
          className="rounded p-0.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Copy ID"
        >
          {copied
            ? <Check className="h-3 w-3 text-status-online" />
            : <Copy className="h-3 w-3" />
          }
        </button>
        {showLink && (
        <a
            href={getUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded p-0.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Open in Discord"
        >
            <ExternalLink className="h-3 w-3" />
        </a>
        )}
      </span>
    </span>
  )
}