/* components/dashboard/add-target-form.tsx */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useSentinel } from "@/lib/context"
import { validateDiscordUserId } from "@/lib/utils"
import { UserPlus, X, AlertTriangle } from "lucide-react"

interface AddTargetFormProps {
  onClose: () => void
}

export function AddTargetForm({ onClose }: AddTargetFormProps) {
  const { addTarget, targets } = useSentinel()
  const [userId, setUserId] = useState("")
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const tooManyTargets = targets.length >= 5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedId = userId.trim()
    
    if (!validateDiscordUserId(trimmedId)) {
      setError("Invalid Discord user ID (must be 17-20 digits)")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await addTarget(trimmedId, label.trim() || undefined)
      setUserId("")
      setLabel("")
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add target")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserPlus className="h-4 w-4 text-primary" />
          Add Target
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {tooManyTargets && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                <strong>Risky:</strong> You already have {targets.length} targets. Monitoring many users simultaneously increases the chance of Discord flagging your account. The selfbot enforces a 1-per-15mins rate limit on new targets.
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            <Input
              placeholder="Discord User ID (17-20 digits)"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                setError(null)
              }}
              className={error ? "border-destructive" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" loading={loading} className="flex-1">
              Track User
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            You can find a user&apos;s ID by enabling Developer Mode in Discord settings, then right-clicking the user.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
