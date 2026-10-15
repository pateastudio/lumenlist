import { beforeEach, describe, expect, it, vi } from "vitest"

const lookup = vi.fn()
vi.mock("node:dns/promises", () => ({ lookup: (...args: unknown[]) => lookup(...args) }))

import { assertSafeUrl, isBlockedIp, ScrapeError, tidyPrice } from "@/lib/scrape"

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "not-an-ip",
  ])("blocks %s", (ip) => expect(isBlockedIp(ip)).toBe(true))

  it.each(["8.8.8.8", "172.32.0.1", "2606:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) =>
    expect(isBlockedIp(ip)).toBe(false),
  )
})

describe("assertSafeUrl", () => {
  beforeEach(() => {
    lookup.mockReset()
  })

  const rejects = async (url: string) => {
    const err = await assertSafeUrl(url).catch((e) => e)
    expect(err).toBeInstanceOf(ScrapeError)
    expect(err.status).toBe(400)
  }

  it("rejects non-http schemes and garbage", async () => {
    await rejects("file:///etc/passwd")
    await rejects("not a url")
  })

  it("rejects literal private IPs and localhost without a DNS lookup", async () => {
    await rejects("http://169.254.169.254/latest/meta-data")
    await rejects("http://localhost:3000")
    await rejects("http://foo.localhost")
    expect(lookup).not.toHaveBeenCalled()
  })

  it("rejects a hostname when ANY resolved address is private", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34" }, { address: "10.0.0.5" }])
    await rejects("https://rebind.example")
  })

  it("rejects a hostname that does not resolve", async () => {
    lookup.mockRejectedValue(new Error("ENOTFOUND"))
    await rejects("https://nope.example")
  })

  it("accepts a public hostname", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34" }])
    await expect(assertSafeUrl("https://example.com/p")).resolves.toBeInstanceOf(URL)
  })
})

describe("tidyPrice", () => {
  it.each([
    ["140.0", "140"], ["79.00", "79"], ["$1,250.00", "1250"], ["65", "65"],
    ["99.95", "99.95"], ["34.5", "34.50"], ["USD 114.9", "114.90"],
  ])("%s becomes %s", (raw, tidy) => expect(tidyPrice(raw)).toBe(tidy))
  it("is null when there is no number", () => {
    expect(tidyPrice(null)).toBeNull()
    expect(tidyPrice("")).toBeNull()
    expect(tidyPrice("Call for price")).toBeNull()
  })
})
