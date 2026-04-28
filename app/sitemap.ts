import { MetadataRoute } from "next"

const BASE_URL = "https://sentinel-panel.vercel.app"

const LAST_UPDATED = new Date("2026-04-28")

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/setup`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]
}