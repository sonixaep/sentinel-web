import type { Metadata } from "next"
import { AppShell }    from "@/components/layout/app-shell"
import { SetupWizard } from "@/components/onboarding/setup-wizard"

export const metadata: Metadata = {
  title: "Setup Guide",
  description:
    "Step-by-step guide to deploy the Sentinel selfbot API — locally on your PC, on a VPS, or on Railway. Get real-time Discord intelligence running in under 10 minutes.",
  alternates: {
    canonical: "https://sentinel-panel.vercel.app/setup",
  },
  openGraph: {
    title:       "Sentinel Setup Guide",
    description: "Deploy the Sentinel selfbot API locally, on a VPS, or on Railway. Full walkthrough with environment config, token setup, and panel connection.",
    url:         "https://sentinel-panel.vercel.app/setup",
  },
}

export default function SetupPage() {
  return (
    <AppShell>
      <SetupWizard />
    </AppShell>
  )
}