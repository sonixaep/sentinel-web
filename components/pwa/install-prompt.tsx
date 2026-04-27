/* components/pwa/install-prompt.tsx */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, X, Download } from "lucide-react"
import { cn } from "@/lib/utils"

const LS_KEY            = "sentinel_pwa_dismissed_at"
const REDISPLAY_DAYS    = 7        // re-show after N days if dismissed
const INITIAL_DELAY_MS  = 20_000   // wait this long before first show

type PromptMode = "hidden" | "android" | "ios"

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  )
}

function recentlyDismissed(): boolean {
  try {
    const ts = localStorage.getItem(LS_KEY)
    if (!ts) return false
    const daysSince = (Date.now() - Number(ts)) / 86_400_000
    return daysSince < REDISPLAY_DAYS
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const [mode, setMode]                   = useState<PromptMode>("hidden")
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Already installed or dismissed recently → do nothing
    if (isStandalone() || recentlyDismissed()) return

    if (isIos()) {
      const timer = setTimeout(() => setMode("ios"), INITIAL_DELAY_MS)
      return () => clearTimeout(timer)
    }

    // Android / Chrome desktop: pick up the deferred prompt
    let timer: ReturnType<typeof setTimeout> | null = null

    const activate = (prompt: any) => {
      setDeferredPrompt(prompt)
      timer = setTimeout(() => setMode("android"), INITIAL_DELAY_MS)
    }

    // The inline script in layout.tsx stores the event on window.__pwaPrompt
    const existing = (window as any).__pwaPrompt
    if (existing) {
      activate(existing)
      return () => { if (timer) clearTimeout(timer) }
    }

    // Otherwise wait for the custom event dispatched by the inline script
    const onReady = () => {
      const prompt = (window as any).__pwaPrompt
      if (prompt) activate(prompt)
    }
    window.addEventListener("pwa-prompt-ready", onReady, { once: true })

    return () => {
      window.removeEventListener("pwa-prompt-ready", onReady)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const dismiss = useCallback(() => {
    try { localStorage.setItem(LS_KEY, String(Date.now())) } catch {}
    setMode("hidden")
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    try {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } finally {
      setMode("hidden")
      setDeferredPrompt(null)
      ;(window as any).__pwaPrompt = null
    }
  }, [deferredPrompt])

  if (mode === "hidden") return null

  return (
    <div
      className={cn(
        "fixed z-50 animate-slide-up",
        // Sit above the mobile nav bar; snap to bottom-right on desktop
        "bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-3 right-3",
        "md:bottom-6 md:left-auto md:right-6 md:w-80"
      )}
      role="dialog"
      aria-label="Install Sentinel app"
    >
      <div
        className="flex items-start gap-3 rounded-xl border p-3 shadow-2xl"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor:     "var(--color-primary)40",
          boxShadow:       "0 8px 40px rgba(0,0,0,0.55)",
        }}
      >
        {/* Icon */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "var(--color-primary)15",
            border:          "1px solid var(--color-primary)25",
          }}
        >
          <Shield className="h-5 w-5 text-primary" />
        </div>

        {/* Text + action */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Install Sentinel</p>

          {mode === "android" && (
            <>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                Add to your home screen for one-tap access, even offline.
              </p>
              <button
                onClick={install}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-75"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <Download className="h-3 w-3" />
                Install App
              </button>
            </>
          )}

          {mode === "ios" && (
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
              Tap the <kbd className="rounded bg-secondary px-1 py-0.5 font-sans text-[10px] text-foreground">Share</kbd> button in Safari then choose <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss install prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}