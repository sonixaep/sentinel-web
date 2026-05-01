/* next.config.ts */
import type { NextConfig } from "next"

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",  value: "on" },
  { key: "X-Frame-Options",         value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
  // Strict-Transport-Security only makes sense over HTTPS – omit for local dev
  // CSP connect-src must be '*' because the API URL is user-configurable at runtime.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://cdn.discordapp.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' *",    // user-supplied API URL – cannot be tightened here
      "frame-ancestors 'none'",
    ].join("; "),
  },
]

// Desktop build sets DESKTOP_BUILD=true to produce a static export.
// Normal builds (Vercel, dev) use standard SSR mode.
const isDesktop = process.env.DESKTOP_BUILD === "true"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: isDesktop,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
    ],
  },
  // Static export only for desktop packaging
  ...(isDesktop ? { output: "export" as const, trailingSlash: true } : {}),
  // Security headers only for server deployments (incompatible with static export)
  ...(!isDesktop
    ? {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: securityHeaders,
            },
          ]
        },
      }
    : {}),
}

export default nextConfig