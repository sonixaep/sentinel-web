# sentinel-web

> Browser-based dashboard for the Sentinel ecosystem. Full analytics, timelines, and real-time monitoring — accessible from any device, no Vencord required.

**Live at:** [sentinel-panel.vercel.app](https://sentinel-panel.vercel.app)

Part of the [Sentinel](https://github.com/Privex-chat/sentinel) project.

---

## What It Does

The web dashboard is a full-featured alternative to the Vencord plugin. It connects directly to your selfbot's API from your browser and gives you:

- Live target overview with real-time status updates
- Per-target deep dives: presence analytics, gaming stats, voice habits, message analysis, music profile, social graph
- Sleep schedule estimation and weekly routine heatmaps
- Anomaly detection and behavioral alerts
- Full message history including deleted and edited messages
- Profile change timeline and avatar gallery
- Alert rule management
- Accessible from any browser, any device, anywhere your selfbot is reachable

No data passes through Vercel or any third party — all API calls go directly from your browser to your selfbot.

---

## Using the Hosted App

1. Open [sentinel-panel.vercel.app](https://sentinel-panel.vercel.app)
2. Go to **Settings**
3. Enter your **Sentinel API URL** and **API Token**
4. Save — the dashboard connects automatically

Full guide: [docs/web.md](https://github.com/Privex-chat/sentinel/blob/main/docs/web.md)

---

## Self-Hosting

### Requirements

- Node.js 18 or newer
- pnpm (recommended)

### Local Development

```bash
git clone https://github.com/Privex-chat/sentinel-web.git
cd sentinel-web
pnpm install
pnpm dev
```

### Production Build

```bash
pnpm build
pnpm start
```

### Docker

```bash
docker build -t sentinel-web .
docker run -p 3000:3000 sentinel-web
```

### Deploy to Vercel

Fork the repository and import it into Vercel. No environment variables required — all configuration happens at runtime through the Settings page.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Charts | Custom SVG + Recharts |
| Icons | Lucide React |
| Deployment | Vercel (hosted) or self-hosted |

---

## Requirements

- A running [sentinel-selfbot](https://github.com/Privex-chat/sentinel-selfbot) instance
- The selfbot must be reachable from your browser (local or public URL)

---

## Related

- [sentinel-selfbot](https://github.com/Privex-chat/sentinel-selfbot) — The data collection engine
- [sentinel-plugin](https://github.com/Privex-chat/sentinel-plugin) — Vencord plugin (Discord-embedded UI)
- [sentinel-proxy](https://github.com/Privex-chat/sentinel-proxy) — Windows proxy for remote selfbot

---

## License

[PolyForm Noncommercial License 1.0.0](LICENSE)
