import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sentinel-panel.vercel.app"

  return [
    {
      url: base + "/",
      lastModified: new Date("2026-04-01"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: base + "/setup",
      lastModified: new Date("2026-04-01"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]
}