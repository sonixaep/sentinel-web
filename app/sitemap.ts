import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sentinel-panel.vercel.app"
  const now = new Date()

  return [
    { url: base,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/setup`,    lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/targets`,  lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/alerts`,   lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${base}/settings`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ]
}