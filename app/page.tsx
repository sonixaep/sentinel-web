/* app/page.tsx */
"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Header } from "@/components/layout/header"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { TargetCard } from "@/components/dashboard/target-card"
import { LiveFeed } from "@/components/dashboard/live-feed"
import { AddTargetForm } from "@/components/dashboard/add-target-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { useSentinel } from "@/lib/context"
import { Users, Plus, Settings, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const {
    targets,
    targetStatuses,
    recentEvents,
    removeTarget,
    isLoading,
    connected,
    settings,
  } = useSentinel()
  const [showAddForm, setShowAddForm] = useState(false)

  if (!settings.sentinelToken) {
    return (
      <AppShell>
        <Header title="Dashboard" />
        <div className="p-4 md:p-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
              <EmptyState
                icon={Settings}
                title="Configuration Required"
                message="Set up your Sentinel API connection in Settings to start tracking targets."
                action={
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Go to Settings
                    </Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (isLoading) {
    return (
      <AppShell>
        <Header title="Dashboard" />
        <div className="flex items-center justify-center p-12">
          <Spinner size={32} />
        </div>
      </AppShell>
    )
  }

  if (!connected) {
    return (
      <AppShell>
        <Header title="Dashboard" />
        <div className="p-4 md:p-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
              <EmptyState
                icon={AlertTriangle}
                title="Connection Failed"
                message="Unable to connect to your Sentinel API. Check your settings and ensure the server is running."
                action={
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href="/settings">Check Settings</Link>
                    </Button>
                    <Button
                      onClick={() => window.location.reload()}
                      className="w-full sm:w-auto"
                    >
                      Retry Connection
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header
        title="Dashboard"
        description="Monitor all tracked targets"
        actions={
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="h-9 px-3 md:px-4"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Add Target</span>
          </Button>
        }
      />

      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Stats */}
        <StatsOverview />

        {/* Main grid */}
        <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
          {/* Targets section */}
          <div className="xl:col-span-2 space-y-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  Targets ({targets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                {showAddForm && (
                  <div className="mb-4">
                    <AddTargetForm onClose={() => setShowAddForm(false)} />
                  </div>
                )}

                {targets.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No Targets"
                    message="Add your first target to start tracking their Discord activity."
                    action={
                      <Button onClick={() => setShowAddForm(true)} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Target
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {targets.map((target) => (
                      <TargetCard
                        key={target.user_id}
                        target={target}
                        status={targetStatuses[target.user_id]}
                        onRemove={() => removeTarget(target.user_id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live feed — now receives targetStatuses for name resolution */}
          <div>
            <LiveFeed
              events={recentEvents}
              targetStatuses={targetStatuses}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}