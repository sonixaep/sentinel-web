/* app/targets/[userId]/config/page.tsx */
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { useApi } from "@/lib/hooks"
import { api } from "@/lib/api"
import { useSentinel } from "@/lib/context"
import { Settings2, CheckCircle } from "lucide-react"
import type { TargetConfig } from "@/lib/types"

export default function ConfigPage() {
  const params = useParams()
  const userId = params.userId as string
  const { settings } = useSentinel()

  const { data, loading, error, refetch } = useApi(
    () => api.getTargetConfig(userId),
    [userId, settings.sentinelToken],
    !!settings.sentinelToken
  )

  if (loading) return <Spinner />
  if (error) return <EmptyState icon={Settings2} title="Error" message={error} />
  if (!data) return <EmptyState icon={Settings2} message="No config data" />

  return <ConfigForm config={data} userId={userId} onSaved={refetch} />
}

function ConfigForm({
  config,
  userId,
  onSaved,
}: {
  config: TargetConfig
  userId: string
  onSaved: () => void
}) {
  const [weights, setWeights] = useState({
    social_weight_messages:    config.social_weight_messages,
    social_weight_reactions:   config.social_weight_reactions,
    social_weight_voice_hours: config.social_weight_voice_hours,
    social_weight_mentions:    config.social_weight_mentions,
    anomaly_z_threshold:       config.anomaly_z_threshold,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setWeights({
      social_weight_messages:    config.social_weight_messages,
      social_weight_reactions:   config.social_weight_reactions,
      social_weight_voice_hours: config.social_weight_voice_hours,
      social_weight_mentions:    config.social_weight_mentions,
      anomaly_z_threshold:       config.anomaly_z_threshold,
    })
  }, [config])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateTargetConfig(userId, weights)
      await onSaved()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error("Failed to save config:", e)
    } finally {
      setSaving(false)
    }
  }

  const SOCIAL_FIELDS: { key: keyof typeof weights; label: string; description: string }[] = [
    {
      key: "social_weight_messages",
      label: "Message Weight",
      description: "Score multiplier per message interaction (default 3.0)",
    },
    {
      key: "social_weight_reactions",
      label: "Reaction Weight",
      description: "Score multiplier per reaction interaction (default 1.0)",
    },
    {
      key: "social_weight_voice_hours",
      label: "Voice Hours Weight",
      description: "Score multiplier per hour of shared voice time (default 5.0)",
    },
    {
      key: "social_weight_mentions",
      label: "Mention Weight",
      description: "Score multiplier per mention interaction (default 2.0)",
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Social graph weights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Social Graph Weights</CardTitle>
          <CardDescription className="text-xs">
            Adjust how different interaction types contribute to the social score. Higher weight = stronger influence on relationship rank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SOCIAL_FIELDS.map(({ key, label, description }) => (
            <NumberField
              key={key}
              label={label}
              description={description}
              value={weights[key]}
              min={0}
              max={20}
              step={0.5}
              onChange={(v) => setWeights((prev) => ({ ...prev, [key]: v }))}
            />
          ))}
        </CardContent>
      </Card>

      {/* Anomaly detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anomaly Detection</CardTitle>
          <CardDescription className="text-xs">
            Tune how sensitive anomaly detection is. Lower z-threshold = more anomalies flagged; higher = only extreme deviations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NumberField
            label="Z-Score Threshold"
            description="Standard deviations from baseline required to flag an anomaly (default 2.0)"
            value={weights.anomaly_z_threshold}
            min={0.5}
            max={5}
            step={0.25}
            onChange={(v) => setWeights((prev) => ({ ...prev, anomaly_z_threshold: v }))}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="h-11 w-full sm:w-auto">
        {saved ? (
          <><CheckCircle className="mr-2 h-4 w-4" />Saved</>
        ) : saving ? (
          "Saving…"
        ) : (
          "Save Configuration"
        )}
      </Button>
    </div>
  )
}

function NumberField({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  description: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">{label}</label>
        <span className="font-mono text-xs font-semibold text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </div>
  )
}
