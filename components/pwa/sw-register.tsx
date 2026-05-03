/* components/pwa/sw-register.tsx */
"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    // Service workers don't work on custom protocols (sentinel://) — skip in Electron desktop
    const proto = window.location.protocol
    if (proto !== "http:" && proto !== "https:") return

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing
          if (!worker) return
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — you can optionally show a toast here
              console.info("[Sentinel] New version available. Refresh to update.")
            }
          })
        })
      } catch (err) {
        console.error("[Sentinel] Service worker registration failed:", err)
      }
    }

    // Wait until page is fully loaded so SW registration doesn't compete
    // with page resources
    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }
  }, [])

  return null
}