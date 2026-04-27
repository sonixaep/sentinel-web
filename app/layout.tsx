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

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "Sentinel — Discord Intelligence Platform",
    template: "%s | Sentinel",
  },
  description:
    "Real-time Discord intelligence with AI-powered analysis. Track presence, messages, voice, and activity patterns with instant alerts. Know everything. Miss nothing.",

  manifest: "/manifest.json",

  // ── Favicon / icons ──────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/icons/icon-32.ico",  sizes: "32x32",   type: "image/x-icon" },
      { url: "/icons/icon-128.ico", sizes: "128x128",  type: "image/x-icon" },
      { url: "/icons/icon-192.png", sizes: "192x192",  type: "image/png"    },
      { url: "/icons/icon-512.png", sizes: "512x512",  type: "image/png"    },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-32.ico",
  },

  // ── Apple PWA meta ────────────────────────────────────────────────────────────
  appleWebApp: {
    capable:         true,
    title:           "Sentinel",
    statusBarStyle:  "black-translucent",
  },

  // ── Open Graph ────────────────────────────────────────────────────────────────
  openGraph: {
    type:        "website",
    url:         BASE_URL,
    siteName:    "Sentinel",
    title:       "Sentinel — Discord Intelligence Platform",
    description:
      "Real-time Discord intelligence with AI-powered analysis. Track presence, messages, voice, and activity with instant alerts.",
    images: [
      {
        url:    "/icons/icon-512.png",
        width:  512,
        height: 512,
        alt:    "Sentinel logo",
      },
    ],
  },

  // ── Twitter card ──────────────────────────────────────────────────────────────
  twitter: {
    card:        "summary",
    title:       "Sentinel — Discord Intelligence Platform",
    description: "Real-time Discord intelligence with AI-powered analysis.",
    images:      ["/icons/icon-512.png"],
  },

  // ── Search / robots ───────────────────────────────────────────────────────────
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  keywords: [
    "Discord",
    "Discord tracker",
    "Discord intelligence",
    "AI analytics",
    "presence tracking",
    "selfbot dashboard",
  ],
}

export const viewport: Viewport = {
  themeColor:    "#0a0a0a",
  width:         "device-width",
  initialScale:  1,
  // Prevents iOS from zooming in on inputs
  maximumScale:  5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/*
          Capture the browser's install prompt BEFORE React hydrates.
          This ensures we never miss the `beforeinstallprompt` event,
          which fires very early in the page lifecycle.
        */}
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