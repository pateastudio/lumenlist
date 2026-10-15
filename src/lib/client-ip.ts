import { timingSafeEqual } from "node:crypto"
import { isIP } from "node:net"

// The header Better Auth reads the client IP from (advanced.ipAddress.ipAddressHeaders). Only the
// auth route sets it; any client-sent copy is overwritten or the request is refused.
export const CLIENT_IP_HEADER = "x-lumenlist-client-ip"

function secretMatches(given: string | null, secret: string): boolean {
  if (!given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Who is this request from, for rate limiting? Behind CloudFront, the answer is
// CloudFront-Viewer-Address ("ip:port", which CloudFront always overwrites), trusted only when
// the request also carries the origin secret CloudFront adds: the Lambda's Function URL is public,
// so anyone can call it directly with made-up headers. Without a trustworthy address the request
// is refused, so Better Auth never falls back to one bucket shared by every user.
//
// With no secret configured (a local run, no CloudFront), everything is one local user.
export function clientIp(headers: Headers, secret: string | undefined): { ip: string } | { reject: true } {
  if (!secret) return { ip: "127.0.0.1" }
  if (!secretMatches(headers.get("x-origin-verify"), secret)) return { reject: true }
  const viewer = headers.get("cloudfront-viewer-address") ?? ""
  const ip = viewer.slice(0, viewer.lastIndexOf(":"))
  return isIP(ip) ? { ip } : { reject: true }
}
