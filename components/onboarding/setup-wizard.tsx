/* components/onboarding/setup-wizard.tsx */
"use client"

import { useState, useCallback } from "react"
import { TokenGenerator } from "./token-generator"
import { EnvBuilder } from "./env-builder"
import { cn } from "@/lib/utils"
import {
  Monitor, Server, Train, ChevronRight, ChevronLeft,
  CheckCircle2, Copy, Check, ExternalLink, Terminal,
  Key, Plug, Rocket, Shield, AlertCircle, Info,
  Package, Zap,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type DeployMethod = "local" | "vps" | "railway"

interface Step {
  id: string
  title: string
  description: string
}

// ─── Step definitions per method ──────────────────────────────────────────────

const LOCAL_STEPS: Step[] = [
  { id: "prereqs",    title: "Prerequisites",      description: "Install Node.js and Git" },
  { id: "clone",      title: "Get the Code",       description: "Clone the repository" },
  { id: "token",      title: "Discord Token",      description: "Get your account token" },
  { id: "config",     title: "Configure",          description: "Set up your .env file" },
  { id: "run",        title: "Run",                description: "Build and start the selfbot" },
  { id: "connect",    title: "Connect Panel",      description: "Link the panel to your API" },
]

const VPS_STEPS: Step[] = [
  { id: "server",     title: "Server Setup",       description: "Prepare your VPS" },
  { id: "clone",      title: "Get the Code",       description: "Clone the repository" },
  { id: "token",      title: "Discord Token",      description: "Get your account token" },
  { id: "config",     title: "Configure",          description: "Set up your .env file" },
  { id: "run",        title: "Run with PM2",       description: "Start and persist the process" },
  { id: "connect",    title: "Connect Panel",      description: "Link the panel to your API" },
]

const RAILWAY_STEPS: Step[] = [
  { id: "token",      title: "Discord Token",      description: "Get your account token" },
  { id: "supabase",   title: "Supabase Database",  description: "Create a free database" },
  { id: "deploy",     title: "Deploy to Railway",  description: "One-click deployment" },
  { id: "config",     title: "Set Variables",      description: "Configure environment" },
  { id: "connect",    title: "Connect Panel",      description: "Link the panel to your API" },
]

const METHOD_STEPS: Record<DeployMethod, Step[]> = {
  local:   LOCAL_STEPS,
  vps:     VPS_STEPS,
  railway: RAILWAY_STEPS,
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
    >
      {copied ? <Check className="h-3 w-3 text-status-online" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  )
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="relative my-3 overflow-hidden rounded-lg border border-border bg-[oklch(0.12_0_0)]">
      {lang && (
        <div className="border-b border-border px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {lang}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 p-4">
        <pre className="flex-1 overflow-x-auto text-xs leading-relaxed text-foreground/90 scrollbar-none">
          <code>{code.trim()}</code>
        </pre>
        <div className="flex-shrink-0 pt-0.5">
          <CopyButton text={code.trim()} />
        </div>
      </div>
    </div>
  )
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip"
  children: React.ReactNode
}) {
  const styles = {
    info:    { bg: "bg-chart-1/8",    border: "border-chart-1/25",    icon: Info,         color: "text-chart-1"    },
    warning: { bg: "bg-status-idle/8",border: "border-status-idle/25",icon: AlertCircle,  color: "text-status-idle"},
    tip:     { bg: "bg-primary/8",    border: "border-primary/25",    icon: Zap,          color: "text-primary"    },
  }
  const s = styles[type]
  return (
    <div className={cn("my-3 flex gap-3 rounded-lg border p-4", s.bg, s.border)}>
      <s.icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", s.color)} />
      <div className="text-sm leading-relaxed text-foreground/85">{children}</div>
    </div>
  )
}

function StepHeader({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary border border-primary/25">
          {num}
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <p className="ml-11 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
    </a>
  )
}

// ─── Shared step content ───────────────────────────────────────────────────────

function DiscordTokenStep({ apiToken }: { apiToken: string }) {
  return (
    <div>
      <StepHeader
        num={1}
        title="Get Your Discord Token"
        desc="You need a token for a dedicated Discord account — not your main one."
      />

      <Callout type="warning">
        <strong>Use a dedicated alt account.</strong> Running a selfbot on your main account risks it being terminated by Discord. Create a fresh account and use that token.
      </Callout>

      <h3 className="mb-2 mt-5 font-semibold">Step 1 — Create a dedicated Discord account</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Go to <ExtLink href="https://discord.com">discord.com</ExtLink> and register a new account with a throwaway email.
        Join every server you want to monitor targets in using this account.
      </p>

      <h3 className="mb-2 mt-5 font-semibold">Step 2 — Extract the token via DevTools</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Open Discord in a browser (not the desktop app). Follow this guide:
      </p>
      <div className="mb-4 rounded-lg border border-border bg-secondary/40 p-4">
        <ol className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
            <span>Open <ExtLink href="https://discord.com/app">discord.com/app</ExtLink> and log into the dedicated account</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
            <span>Press <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs">F12</kbd> to open DevTools (or Ctrl+Shift+I / Cmd+Option+I)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">3</span>
            <span>Go to the <strong>Network</strong> tab, then click any channel or send any message</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">4</span>
            <span>Find a request to <code className="rounded bg-secondary px-1 font-mono text-xs">discord.com/api</code> in the list</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">5</span>
            <span>Click the request → <strong>Headers</strong> → look for <code className="rounded bg-secondary px-1 font-mono text-xs">Authorization</code> in Request Headers — that&apos;s your token</span>
          </li>
        </ol>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Full visual guide: <ExtLink href="https://gist.github.com/MarvNC/e601f3603df22f36ebd3102c501116c6">MarvNC&apos;s Token Guide</ExtLink>
      </p>

      <Callout type="info">
        Keep your token private. It grants full access to the account. If you accidentally expose it, immediately change the account password to invalidate it.
      </Callout>
    </div>
  )
}

function ConnectPanelStep({ apiToken }: { apiToken: string }) {
  return (
    <div>
      <StepHeader
        num={99}
        title="Connect the Panel"
        desc="Point this web panel at your running selfbot API."
      />
      <ol className="space-y-4 text-sm">
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">1</span>
          <span>Go to <strong>Settings</strong> in this panel (gear icon in the sidebar)</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">2</span>
          <div>
            <p className="mb-1">Set <strong>Sentinel API URL</strong> to your selfbot&apos;s address:</p>
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li>Local: <code className="rounded bg-secondary px-1 font-mono text-xs">http://localhost:48923</code></li>
              <li>VPS: <code className="rounded bg-secondary px-1 font-mono text-xs">http://YOUR_SERVER_IP:48923</code></li>
              <li>Railway: your Railway public URL (shown in Railway dashboard)</li>
            </ul>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">3</span>
          <div>
            <p className="mb-1">Set <strong>API Token</strong> to the <code className="rounded bg-secondary px-1 font-mono text-xs">API_AUTH_TOKEN</code> you generated:</p>
            {apiToken && (
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded border border-border bg-secondary px-2 py-1 font-mono text-xs">{apiToken}</code>
                <CopyButton text={apiToken} label="Copy token" />
              </div>
            )}
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">4</span>
          <span>Click <strong>Save Configuration</strong> — the status badge should turn green ✓</span>
        </li>
      </ol>
      <Callout type="tip">
        Once connected, head to the <strong>Dashboard</strong> and click <strong>Add Target</strong> to start tracking your first Discord user!
      </Callout>
    </div>
  )
}

// ─── Local step content ────────────────────────────────────────────────────────

function LocalStepContent({
  stepId,
  apiToken,
  discordToken,
}: {
  stepId: string
  apiToken: string
  discordToken: string
}) {
  switch (stepId) {
    case "prereqs":
      return (
        <div>
          <StepHeader num={1} title="Install Prerequisites" desc="You need Node.js 18+ and Git on your machine." />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Package className="h-5 w-5 text-chart-1" />
                <h3 className="font-semibold">Node.js 18+</h3>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Download and install from the official website.</p>
              <a
                href="https://nodejs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-chart-1/10 border border-chart-1/20 px-3 py-2 text-xs font-medium text-chart-1 hover:bg-chart-1/20 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                nodejs.org
              </a>
              <p className="mt-3 text-xs text-muted-foreground">Verify: <code className="rounded bg-secondary px-1 font-mono">node --version</code></p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-chart-3" />
                <h3 className="font-semibold">Git</h3>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Required to clone the repository.</p>
              <a
                href="https://git-scm.com/downloads"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-chart-3/10 border border-chart-3/20 px-3 py-2 text-xs font-medium text-chart-3 hover:bg-chart-3/20 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                git-scm.com
              </a>
              <p className="mt-3 text-xs text-muted-foreground">Verify: <code className="rounded bg-secondary px-1 font-mono">git --version</code></p>
            </div>
          </div>
        </div>
      )

    case "clone":
      return (
        <div>
          <StepHeader num={2} title="Clone the Repository" desc="Download the selfbot source code." />
          <p className="mb-2 text-sm text-muted-foreground">Open a terminal and run:</p>
          <CodeBlock lang="bash" code={`git clone https://github.com/sonixaep/sentinel-selfbot.git
cd sentinel-selfbot
npm install`} />
          <Callout type="info">
            The <code>npm install</code> step downloads all dependencies. It may take a minute.
          </Callout>
        </div>
      )

    case "token":
      return <DiscordTokenStep apiToken={apiToken} />

    case "config":
      return (
        <div>
          <StepHeader num={4} title="Configure Environment" desc="Create your .env file with all required settings." />
          <p className="mb-3 text-sm text-muted-foreground">Copy the example file, then edit it:</p>
          <CodeBlock lang="bash" code="cp .env.example .env" />
          <p className="mb-2 mt-4 text-sm font-medium">Your .env should look like this:</p>
          <EnvBuilder method="local" apiToken={apiToken} discordToken={discordToken} />
        </div>
      )

    case "run":
      return (
        <div>
          <StepHeader num={5} title="Build & Run" desc="Compile TypeScript and start the selfbot." />
          <CodeBlock lang="bash" code={`npm run build
npm start`} />
          <p className="mt-3 mb-2 text-sm text-muted-foreground">You should see output like:</p>
          <CodeBlock lang="log" code={`[INFO] [Sentinel] === Sentinel Starting ===
[INFO] [Database] Database initialized with WAL mode
[INFO] [API] API server listening on port 48923
[INFO] [Gateway] Connecting to gateway...
[INFO] [Gateway] READY! Logged in as YourUsername#0 | N guilds
[INFO] [Sentinel] === Sentinel Fully Operational ===`} />
          <Callout type="tip">
            Keep this terminal window open while using Sentinel. The selfbot must stay running to collect data.
          </Callout>
        </div>
      )

    case "connect":
      return <ConnectPanelStep apiToken={apiToken} />

    default:
      return null
  }
}

// ─── VPS step content ──────────────────────────────────────────────────────────

function VpsStepContent({
  stepId,
  apiToken,
  discordToken,
}: {
  stepId: string
  apiToken: string
  discordToken: string
}) {
  switch (stepId) {
    case "server":
      return (
        <div>
          <StepHeader num={1} title="Prepare Your VPS" desc="Install Node.js, npm, and PM2 on a fresh server." />
          <Callout type="info">
            Any Linux VPS works — Ubuntu 22.04 is recommended. A $5/month server (DigitalOcean, Hetzner, Vultr, etc.) is more than enough.
          </Callout>
          <p className="mb-2 mt-4 text-sm font-medium">Run these as root or with sudo:</p>
          <CodeBlock lang="bash" code={`# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# Install PM2 globally
npm install -g pm2

# Verify
node --version && npm --version && pm2 --version`} />
          <h3 className="mb-2 mt-5 font-semibold">Open firewall port</h3>
          <p className="mb-2 text-sm text-muted-foreground">Allow the API port through your firewall:</p>
          <CodeBlock lang="bash" code={`# UFW (Ubuntu)
ufw allow 48923/tcp

# Or if using firewalld
firewall-cmd --permanent --add-port=48923/tcp && firewall-cmd --reload`} />
        </div>
      )

    case "clone":
      return (
        <div>
          <StepHeader num={2} title="Clone the Repository" desc="Download the selfbot source code onto your server." />
          <CodeBlock lang="bash" code={`git clone https://github.com/sonixaep/sentinel-selfbot.git
cd sentinel-selfbot
npm install`} />
        </div>
      )

    case "token":
      return <DiscordTokenStep apiToken={apiToken} />

    case "config":
      return (
        <div>
          <StepHeader num={4} title="Configure Environment" desc="Create your .env file." />
          <CodeBlock lang="bash" code="cp .env.example .env && nano .env" />
          <p className="mb-2 mt-4 text-sm font-medium">Fill in your .env like this:</p>
          <EnvBuilder method="vps" apiToken={apiToken} discordToken={discordToken} />
        </div>
      )

    case "run":
      return (
        <div>
          <StepHeader num={5} title="Run with PM2" desc="Build and start the selfbot as a persistent background process." />
          <CodeBlock lang="bash" code={`npm run build

# Start with PM2
pm2 start dist/index.js --name sentinel
pm2 save

# Auto-start on server reboot
pm2 startup
# Copy and run the command PM2 prints`} />
          <p className="mb-2 mt-4 text-sm font-medium">Useful PM2 commands:</p>
          <CodeBlock lang="bash" code={`pm2 logs sentinel      # view live logs
pm2 status             # check running status
pm2 restart sentinel   # restart
pm2 stop sentinel      # stop`} />
          <Callout type="tip">
            Test the API is reachable from your browser by visiting <code>http://YOUR_SERVER_IP:48923/api/status</code> with the Authorization header, or use <code>curl</code>.
          </Callout>
        </div>
      )

    case "connect":
      return <ConnectPanelStep apiToken={apiToken} />

    default:
      return null
  }
}

// ─── Railway step content ──────────────────────────────────────────────────────

function RailwayStepContent({
  stepId,
  apiToken,
  discordToken,
}: {
  stepId: string
  apiToken: string
  discordToken: string
}) {
  switch (stepId) {
    case "token":
      return <DiscordTokenStep apiToken={apiToken} />

    case "supabase":
      return (
        <div>
          <StepHeader num={2} title="Create a Supabase Database" desc="Railway containers have ephemeral storage — Supabase provides free persistent cloud storage." />
          <ol className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">1</span>
              <div>
                <p>Go to <ExtLink href="https://supabase.com">supabase.com</ExtLink> and sign up for a free account</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">2</span>
              <div>
                <p>Click <strong>New Project</strong>, name it <code className="rounded bg-secondary px-1 font-mono text-xs">sentinel</code>, set a strong database password, pick a nearby region</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">3</span>
              <div>
                <p>Go to <strong>SQL Editor → New Query</strong>, paste the schema from:</p>
                <ExtLink href="https://github.com/sonixaep/sentinel-selfbot/blob/main/sentinel-selfbot/supabase-schema.sql">
                  sentinel-selfbot/supabase-schema.sql
                </ExtLink>
                <p className="mt-1 text-muted-foreground">Run it — all 13 tables will be created.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/25">4</span>
              <div>
                <p className="mb-1">Save these two values from <strong>Settings → API</strong>:</p>
                <ul className="ml-2 space-y-1 text-muted-foreground">
                  <li>• <strong>Project URL</strong> — looks like <code className="rounded bg-secondary px-1 font-mono text-xs">https://xxxx.supabase.co</code></li>
                  <li>• <strong>service_role key</strong> — the long JWT token (not the anon key)</li>
                </ul>
              </div>
            </li>
          </ol>
          <Callout type="warning">
            Use the <strong>service_role</strong> key, not the anon key. The service_role key bypasses Row Level Security, which Sentinel requires to write data.
          </Callout>
        </div>
      )

    case "deploy":
      return (
        <div>
          <StepHeader num={3} title="Deploy to Railway" desc="Click the button below to deploy the selfbot to Railway in one step." />

          <div className="my-6 flex flex-col items-center gap-4">
            <a
              href="https://railway.app/template/sentinel-selfbot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-xl bg-[#850BFF] px-6 py-4 text-white font-semibold shadow-lg hover:bg-[#7200e0] transition-colors text-base"
            >
              <Train className="h-5 w-5" />
              Deploy on Railway
            </a>
            <p className="text-xs text-muted-foreground">
              If the template link doesn&apos;t work, fork the repo and deploy via{" "}
              <ExtLink href="https://railway.app/new">railway.app/new</ExtLink> →
              Deploy from GitHub → select your fork.
            </p>
          </div>

          <Callout type="info">
            Railway gives you <strong>$5/month free credit</strong> — more than enough to run the selfbot 24/7.
            No credit card required for the free tier.
          </Callout>

          <h3 className="mb-2 mt-5 font-semibold">Manual deploy (alternative)</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Fork <ExtLink href="https://github.com/sonixaep/sentinel-selfbot">sonixaep/sentinel-selfbot</ExtLink> to your GitHub account</li>
            <li>2. Go to <ExtLink href="https://railway.app/new">railway.app/new</ExtLink> → <strong>Deploy from GitHub repo</strong></li>
            <li>3. Select your forked repo → Railway auto-detects the <code className="rounded bg-secondary px-1 font-mono text-xs">railway.toml</code></li>
          </ol>
        </div>
      )

    case "config":
      return (
        <div>
          <StepHeader num={4} title="Set Environment Variables" desc="Configure the selfbot in the Railway dashboard." />
          <p className="mb-3 text-sm text-muted-foreground">
            In Railway, open your project → click the service → go to <strong>Variables</strong> tab and add:
          </p>
          <EnvBuilder method="railway" apiToken={apiToken} discordToken={discordToken} />
          <Callout type="tip">
            After saving variables, Railway automatically redeploys. Check the <strong>Deploy Logs</strong> to confirm the selfbot started successfully.
          </Callout>
          <h3 className="mb-2 mt-5 font-semibold">Get your public URL</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            In Railway → your service → <strong>Settings → Networking → Generate Domain</strong>.
            This creates a public HTTPS URL like <code className="rounded bg-secondary px-1 font-mono text-xs">sentinel-selfbot-production-xxxx.up.railway.app</code>.
          </p>
        </div>
      )

    case "connect":
      return <ConnectPanelStep apiToken={apiToken} />

    default:
      return null
  }
}

// ─── Progress sidebar ──────────────────────────────────────────────────────────

function ProgressSidebar({
  steps,
  currentIdx,
  completedIdx,
  onJump,
}: {
  steps: Step[]
  currentIdx: number
  completedIdx: number
  onJump: (i: number) => void
}) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const done   = i <= completedIdx
        const active = i === currentIdx
        return (
          <button
            key={step.id}
            onClick={() => onJump(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              active  ? "bg-primary/10 border border-primary/25" : "hover:bg-secondary/60",
              !active && !done && i > completedIdx + 1 && "opacity-40 cursor-not-allowed"
            )}
            disabled={!active && !done && i > completedIdx + 1}
          >
            <div
              className={cn(
                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold border transition-colors",
                done    ? "bg-status-online/15 border-status-online/30 text-status-online" :
                active  ? "bg-primary/15 border-primary/30 text-primary" :
                          "bg-secondary border-border text-muted-foreground"
              )}
            >
              {done && !active ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs font-medium leading-tight", active ? "text-foreground" : "text-muted-foreground")}>{step.title}</p>
              <p className="text-[10px] text-muted-foreground/70 truncate">{step.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Method card ───────────────────────────────────────────────────────────────

function MethodCard({
  icon: Icon,
  title,
  description,
  pros,
  difficulty,
  selected,
  onClick,
  accentColor,
}: {
  icon: React.ElementType
  title: string
  description: string
  pros: string[]
  difficulty: string
  selected: boolean
  onClick: () => void
  accentColor: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-5 text-left transition-all duration-200",
        selected
          ? `border-primary/50 bg-primary/8`
          : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl")} style={{ backgroundColor: `${accentColor}18` }}>
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        {selected && (
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
        )}
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground leading-relaxed">{description}</p>
      <ul className="space-y-1 mb-3">
        {pros.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-status-online" />
            {p}
          </li>
        ))}
      </ul>
      <div className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {difficulty}
      </div>
    </button>
  )
}

// ─── Main wizard ───────────────────────────────────────────────────────────────

export function SetupWizard() {
  const [phase, setPhase] = useState<"method" | "token" | "steps">("method")
  const [method, setMethod] = useState<DeployMethod | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [maxReached, setMaxReached] = useState(0)
  const [apiToken, setApiToken] = useState("")
  const [discordToken, setDiscordToken] = useState("")

  const steps = method ? METHOD_STEPS[method] : []
  const currentStep = steps[stepIdx]

  const goNext = useCallback(() => {
    if (stepIdx < steps.length - 1) {
      const next = stepIdx + 1
      setStepIdx(next)
      setMaxReached((m) => Math.max(m, next))
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [stepIdx, steps.length])

  const goPrev = useCallback(() => {
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [stepIdx])

  const startSetup = () => {
    if (!method) return
    setStepIdx(0)
    setMaxReached(0)
    setPhase("token")
  }

  // ── Phase: choose method ──────────────────────────────────────────────────

  if (phase === "method") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Welcome to Sentinel</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Sentinel requires a selfbot API running somewhere that this panel can connect to.
            Choose how you want to deploy it.
          </p>
        </div>

        {/* Token generator */}
        <div className="mb-8 rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Step 1 — Generate your API Auth Token</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            This password secures your selfbot API. Generate one now — you&apos;ll need it during setup.
          </p>
          <TokenGenerator value={apiToken} onChange={setApiToken} />
        </div>

        {/* Method selection */}
        <h2 className="mb-4 font-semibold">Step 2 — Choose your deployment method</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MethodCard
            icon={Monitor}
            title="Local PC"
            description="Run the selfbot on your own Windows, Mac, or Linux computer."
            pros={["Free", "Easy to set up", "Full control"]}
            difficulty="⭐ Beginner"
            selected={method === "local"}
            onClick={() => setMethod("local")}
            accentColor="var(--color-chart-1)"
          />
          <MethodCard
            icon={Server}
            title="VPS / Server"
            description="Run 24/7 on a cheap cloud server. Best for reliability."
            pros={["Always online", "~$5/month", "Production-ready"]}
            difficulty="⭐⭐ Intermediate"
            selected={method === "vps"}
            onClick={() => setMethod("vps")}
            accentColor="var(--color-chart-3)"
          />
          <MethodCard
            icon={Train}
            title="Railway"
            description="Deploy to Railway's cloud platform with one click. No server management."
            pros={["Free tier available", "Auto-restarts", "HTTPS included"]}
            difficulty="⭐ Beginner"
            selected={method === "railway"}
            onClick={() => setMethod("railway")}
            accentColor="#850BFF"
          />
        </div>

        {method && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={startSetup}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90 transition-colors shadow-lg"
            >
              Start Setup
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Phase: token generator ────────────────────────────────────────────────

  if (phase === "token") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => setPhase("method")}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to method selection
          </button>
          <h1 className="text-2xl font-bold mb-1">Quick Setup</h1>
          <p className="text-muted-foreground text-sm">Enter a few values before we walk you through the guide.</p>
        </div>

        <div className="space-y-5">
          {/* API Token reminder */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">API Auth Token</h3>
            </div>
            <TokenGenerator value={apiToken} onChange={setApiToken} />
          </div>

          {/* Discord token */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Plug className="h-4 w-4 text-chart-3" />
              <h3 className="font-semibold text-sm">Discord Token <span className="text-muted-foreground font-normal">(optional — you can add it later)</span></h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Paste your dedicated account token here for a pre-filled config file.</p>
            <input
              type="password"
              placeholder="Paste your Discord token here…"
              value={discordToken}
              onChange={(e) => setDiscordToken(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <p className="mt-2 text-[10px] text-muted-foreground">This is stored only in your browser session and used to pre-fill the config guide below.</p>
          </div>

          <button
            onClick={() => setPhase("steps")}
            disabled={!apiToken}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            Continue to Setup Guide
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: step-by-step guide ─────────────────────────────────────────────

  const renderStepContent = () => {
    if (!method || !currentStep) return null
    const props = { stepId: currentStep.id, apiToken, discordToken }
    if (method === "local")   return <LocalStepContent   {...props} />
    if (method === "vps")     return <VpsStepContent     {...props} />
    if (method === "railway") return <RailwayStepContent {...props} />
    return null
  }

  const isLastStep = stepIdx === steps.length - 1

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 md:px-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => setPhase("token")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {stepIdx + 1} / {steps.length}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Sidebar */}
        <aside className="hidden md:block">
          <ProgressSidebar
            steps={steps}
            currentIdx={stepIdx}
            completedIdx={maxReached}
            onJump={(i) => { if (i <= maxReached) { setStepIdx(i); window.scrollTo({ top: 0, behavior: "smooth" }) } }}
          />
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <div className="rounded-xl border border-border bg-card p-6 md:p-8">
            {renderStepContent()}
          </div>

          {/* Nav buttons */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={goPrev}
              disabled={stepIdx === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {isLastStep ? (
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-status-online/10 border border-status-online/25 px-5 py-2.5 text-sm font-semibold text-status-online hover:bg-status-online/20 transition-colors"
              >
                <Rocket className="h-4 w-4" />
                Go to Dashboard
              </a>
            ) : (
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow"
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}