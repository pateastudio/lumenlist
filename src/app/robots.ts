import type { MetadataRoute } from "next"
import { appEnv } from "@/lib/environment"

// Read per request, never baked at build: APP_ENV is set on the running server, not at build
// time, and only prod may be indexed. Dev and staging answer "nothing".
export const dynamic = "force-dynamic"

export default function robots(): MetadataRoute.Robots {
  if (appEnv() !== "prod") return { rules: { userAgent: "*", disallow: "/" } }
  // The front page and the sign-in pages are public. Everything else is private or is a personal link.
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/gifts", "/families", "/members", "/account", "/invite/", "/join/"] },
  }
}
