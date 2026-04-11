/* app/setup/page.tsx */
"use client"

import { AppShell } from "@/components/layout/app-shell"
import { SetupWizard } from "@/components/onboarding/setup-wizard"

export default function SetupPage() {
  return (
    <AppShell>
      <SetupWizard />
    </AppShell>
  )
}