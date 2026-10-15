import { describe, expect, it } from "vitest"
import { CLIENT_IP_HEADER, clientIp } from "@/lib/client-ip"

const h = (o: Record<string, string>) => new Headers(o)
const SECRET = "s3cret-value"

describe("clientIp", () => {
  it("uses CloudFront's viewer address when the origin secret matches", () => {
    expect(clientIp(h({ "x-origin-verify": SECRET, "cloudfront-viewer-address": "198.51.100.10:46532" }), SECRET)).toEqual({ ip: "198.51.100.10" })
  })
  it("handles IPv6 viewer addresses (the port is after the last colon)", () => {
    expect(clientIp(h({ "x-origin-verify": SECRET, "cloudfront-viewer-address": "2001:db8:85a3::8a2e:370:7334:46532" }), SECRET)).toEqual({ ip: "2001:db8:85a3::8a2e:370:7334" })
  })
  it("rejects a request without the origin secret, even with a viewer address (a direct Function URL call)", () => {
    expect(clientIp(h({ "cloudfront-viewer-address": "1.2.3.4:5" }), SECRET)).toEqual({ reject: true })
    expect(clientIp(h({ "x-origin-verify": "guess", "cloudfront-viewer-address": "1.2.3.4:5" }), SECRET)).toEqual({ reject: true })
  })
  it("rejects when the secret matches but there's no usable address", () => {
    expect(clientIp(h({ "x-origin-verify": SECRET }), SECRET)).toEqual({ reject: true })
    expect(clientIp(h({ "x-origin-verify": SECRET, "cloudfront-viewer-address": "nonsense" }), SECRET)).toEqual({ reject: true })
  })
  it("never trusts a client-sent copy of our own header", () => {
    expect(clientIp(h({ [CLIENT_IP_HEADER]: "9.9.9.9" }), SECRET)).toEqual({ reject: true })
  })
  it("treats a run with no secret configured as one local user", () => {
    expect(clientIp(h({}), undefined)).toEqual({ ip: "127.0.0.1" })
    expect(clientIp(h({ "cloudfront-viewer-address": "1.2.3.4:5" }), "")).toEqual({ ip: "127.0.0.1" })
  })
})
