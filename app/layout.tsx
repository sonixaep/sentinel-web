/* app/layout.tsx */
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { SentinelProvider } from "@/lib/context"
import { SwRegister }       from "@/components/pwa/sw-register"
import { InstallPrompt }    from "@/components/pwa/install-prompt"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const BASE_URL = "https://sentinel-panel.vercel.app"

// ── JSON-LD structured data ────────────────────────────────────────────────────
// WebApplication schema helps Google understand what Sentinel is and display
// rich results in search. This is the single most impactful technical SEO
// addition for a web app.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Sentinel",
  url: BASE_URL,
  description:
    "Self-hosted Discord intelligence platform. Real-time presence tracking, AI-powered message analysis, social graph mapping, sleep schedule detection, and instant webhook alerts.",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires JavaScript",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Hemansh",
    url: "https://github.com/Privex-chat",
  },
  softwareVersion: "1.0.0",
  releaseNotes: "https://github.com/Privex-chat/sentinel-web",
  screenshot: `${BASE_URL}/icons/icon-512.png`,
  featureList: [
    "Real-time Discord presence tracking",
    "AI-powered message categorisation",
    "Social graph analysis",
    "Sleep schedule estimation",
    "Anomaly detection",
    "Webhook alerts",
    "Message history including deleted and edited messages",
    "Voice call analytics",
    "Gaming and Spotify activity tracking",
    "Stalking",
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "Sentinel — Discord Intelligence Platform",
    template: "%s | Sentinel",
  },
  description:
    "Self-hosted Discord intelligence platform. Track presence, messages, voice, and activity in real time. AI-powered analysis, sleep schedule detection, social graph mapping, and instant alerts.",

  // ── Canonical ────────────────────────────────────────────────────────────────
  // The trailing slash here must match the URL in sitemap.ts.
  // This tells Google there is one authoritative URL for the homepage.
  alternates: {
    canonical: `${BASE_URL}/`,
  },

  manifest: "/manifest.json",

  // ── Favicon / icons ──────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/icons/icon-32.ico",  sizes: "32x32",  type: "image/x-icon" },
      { url: "/icons/icon-128.ico", sizes: "128x128", type: "image/x-icon" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png"    },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png"    },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-32.ico",
  },

  // ── Apple PWA meta ────────────────────────────────────────────────────────────
  appleWebApp: {
    capable:        true,
    title:          "Sentinel",
    statusBarStyle: "black-translucent",
  },

  // ── Open Graph ────────────────────────────────────────────────────────────────
  openGraph: {
    type:        "website",
    url:         `${BASE_URL}/`,
    siteName:    "Sentinel",
    title:       "Sentinel — Discord Intelligence Platform",
    description:
      "Self-hosted Discord intelligence. Real-time presence tracking, AI message analysis, social graph mapping, sleep schedules, and instant webhook alerts.",
    images: [
      {
        url:    "/icons/icon-512.png",
        width:  512,
        height: 512,
        alt:    "Sentinel — Discord Intelligence Platform",
      },
    ],
    locale: "en_US",
  },

  // ── Twitter card ──────────────────────────────────────────────────────────────
  twitter: {
    card:        "summary",
    title:       "Sentinel — Discord Intelligence Platform",
    description:
      "Self-hosted Discord intelligence. Real-time tracking, AI analysis, and instant alerts.",
    images: ["/icons/icon-512.png"],
  },

  // ── Search / robots ───────────────────────────────────────────────────────────
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  // ── Keywords ──────────────────────────────────────────────────────────────────
  // These are a minor signal at best — focus stays on title/description quality.
  keywords: [
    "Discord intelligence",
    "Discord tracker",
    "Discord analytics",
    "Discord monitoring",
    "selfbot dashboard",
    "stalker",
    "stalking tool",
    "how to stalk someone on Discord",
    "stalkware",
    "Discord stalker",
    "Stalking on Discord",
    "Discord presence tracker",
    "AI Discord analysis",
    "Discord activity monitor",
    "self-hosted Discord tool",
  ],
}

export const viewport: Viewport = {
  themeColor:   "#0a0a0a",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data — helps Google understand this is a WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__pwaPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwaPrompt = e;
                window.dispatchEvent(new Event('pwa-prompt-ready'));
              });
              window.addEventListener('appinstalled', function() {
                window.__pwaPrompt = null;
              });
            `,
          }}
        />
      </head>

      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <SentinelProvider>
          {/* Registers /sw.js as soon as the page loads */}
          <SwRegister />

          {children}

          {/* Floating install-to-home-screen banner */}
          <InstallPrompt />
        </SentinelProvider>
      </body>
    </html>
  )
}