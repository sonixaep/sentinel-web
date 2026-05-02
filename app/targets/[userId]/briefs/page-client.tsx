/* app/targets/[userId]/briefs/page.tsx */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { useApi, useTargetUserId } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { formatDateTime } from "@/lib/utils"
import { FileText, RefreshCw, Calendar } from "lucide-react"
import type { DailyBrief } from "@/lib/types"

export default function BriefsPage() {
  const userId = useTargetUserId()
  const { settings } = useSentinel()
  const [generating, setGenerating] = useState(false)
  const [dateInput, setDateInput] = useState("")
  const [selectedBrief, setSelectedBrief] = useState<DailyBrief | null>(null)

  const { data: briefs, loading, error, refetch } = useApi(
    () => api.getDailyBriefs(userId, 30),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  const handleGenerate = async (date?: string) => {
    setGenerating(true)
    try {
      const result = await api.generateBrief(userId, date || undefined)
      await refetch()
      const fresh = await api.getDailyBriefs(userId, 30)
      const found = fresh.find((b) => b.date === result.date)
      if (found) setSelectedBrief(found)
    } catch (e) {
      console.error("Failed to generate brief:", e)
    } finally {
      setGenerating(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  if (loading) return <Spinner />
  if (error) return <EmptyState icon={FileText} title="Error" message={error} />

  if (!briefs || briefs.length === 0) {
    return (
      <div className="space-y-4">
        <GenerateCard
          today={today}
          dateInput={dateInput}
          setDateInput={setDateInput}
          generating={generating}
          onGenerate={handleGenerate}
        />
        <EmptyState
          icon={FileText}
          title="No Briefs Yet"
          message="Generate a brief to get an AI-written daily intelligence summary. Requires AI_PROVIDER to be configured in your selfbot .env."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <GenerateCard
        today={today}
        dateInput={dateInput}
        setDateInput={setDateInput}
        generating={generating}
        onGenerate={handleGenerate}
      />

      {selectedBrief && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                {selectedBrief.date}
              </CardTitle>
              <button
                onClick={() => setSelectedBrief(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Generated {formatDateTime(selectedBrief.generated_at)}
            </p>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
              {selectedBrief.brief_text}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {briefs.map((brief) => (
          <BriefCard
            key={brief.id}
            brief={brief}
            isSelected={selectedBrief?.id === brief.id}
            onClick={() => setSelectedBrief(selectedBrief?.id === brief.id ? null : brief)}
            onRegenerate={() => handleGenerate(brief.date)}
            generating={generating}
          />
        ))}
      </div>
    </div>
  )
}

function GenerateCard({
  today,
  dateInput,
  setDateInput,
  generating,
  onGenerate,
}: {
  today: string
  dateInput: string
  setDateInput: (v: string) => void
  generating: boolean
  onGenerate: (date?: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Generate Brief</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              max={today}
              className="h-10 w-full rounded-md border bg-input pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button
            onClick={() => onGenerate(dateInput || undefined)}
            disabled={generating}
            className="h-10"
          >
            {generating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {generating ? "Generating…" : dateInput ? "Generate for Date" : "Generate Today"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BriefCard({
  brief,
  isSelected,
  onClick,
  onRegenerate,
  generating,
}: {
  brief: DailyBrief
  isSelected: boolean
  onClick: () => void
  onRegenerate: () => void
  generating: boolean
}) {
  const preview = brief.brief_text.slice(0, 160).replace(/\n/g, " ")

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-secondary/30 ${isSelected ? "border-primary/40" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{brief.date}</p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {preview}{brief.brief_text.length > 160 ? "…" : ""}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Generated {formatDateTime(brief.generated_at)}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRegenerate() }}
          disabled={generating}
          className="flex-shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          title="Regenerate"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
        </button>
      </div>
      {isSelected && (
        <div className="border-t px-4 pb-4 pt-3">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
            {brief.brief_text}
          </pre>
        </div>
      )}
    </Card>
  )
}
