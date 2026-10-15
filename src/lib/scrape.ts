import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { load, type CheerioAPI } from "cheerio"

export interface ScrapedGift {
  title: string | null
  image_url: string | null
  price: string | null
  description: string | null
}

const FETCH_TIMEOUT_MS = 8000
const MAX_BYTES = 2_000_000 // 2 MB cap on HTML we'll read
const MAX_REDIRECTS = 5
const USER_AGENT =
  "Mozilla/5.0 (compatible; FamilyGiftRegistryBot/1.0; +https://lumenlist.app)"

/**
 * Returns true when the given IP address is loopback, private, link-local, or
 * otherwise not a public unicast address. Used to block SSRF against internal
 * infrastructure.
 */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip)
  if (kind === 4) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 0) return true // 0.0.0.0/8
    if (a === 10) return true // 10.0.0.0/8
    if (a === 127) return true // loopback
    if (a === 169 && b === 254) return true // link-local
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
    if (a >= 224) return true // multicast / reserved
    return false
  }
  if (kind === 6) {
    const v = ip.toLowerCase()
    if (v === "::1" || v === "::") return true // loopback / unspecified
    if (v.startsWith("fe80")) return true // link-local
    if (v.startsWith("fc") || v.startsWith("fd")) return true // unique local
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — re-check the embedded v4 address
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isBlockedIp(mapped[1])
    return false
  }
  return true // not a recognizable IP
}

/**
 * Validates a user-supplied URL and guards against SSRF by resolving the
 * hostname and rejecting private/loopback targets. Throws on invalid input.
 */
export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ScrapeError("That doesn't look like a valid URL.", 400)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("Only http and https links are supported.", 400)
  }

  const host = url.hostname
  // Literal IPs: check directly. Hostnames: resolve then check every address.
  if (isIP(host)) {
    if (isBlockedIp(host)) {
      throw new ScrapeError("That link points to a private address.", 400)
    }
  } else {
    if (host === "localhost" || host.endsWith(".localhost")) {
      throw new ScrapeError("That link points to a private address.", 400)
    }
    let records: { address: string }[]
    try {
      records = await lookup(host, { all: true })
    } catch {
      throw new ScrapeError("Couldn't resolve that site's address.", 400)
    }
    if (records.length === 0 || records.some((r) => isBlockedIp(r.address))) {
      throw new ScrapeError("That link points to a private address.", 400)
    }
  }

  return url
}

export class ScrapeError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = "ScrapeError"
    this.status = status
  }
}

/**
 * Fetches `startUrl`, following redirects manually (rather than via fetch's
 * built-in `redirect: "follow"`) so every hop can be re-validated through
 * `assertSafeUrl`. A public URL that 302s to a private/loopback/metadata
 * address would otherwise bypass the initial SSRF check entirely, since
 * fetch's automatic redirect handling never re-runs it.
 */
async function fetchFollowingRedirects(
  startUrl: URL,
  signal: AbortSignal
): Promise<{ res: Response; finalUrl: URL }> {
  let current = startUrl
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(current, {
      signal,
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    })

    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null
    if (!location) return { res, finalUrl: current }

    let next: URL
    try {
      next = new URL(location, current)
    } catch {
      throw new ScrapeError("That site sent a broken redirect.", 502)
    }
    current = await assertSafeUrl(next.href)
  }
  throw new ScrapeError("Too many redirects.", 502)
}

/** Reads the response body up to MAX_BYTES, decoding as UTF-8 text. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return await res.text()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      total += value.length
      chunks.push(value)
      if (total >= MAX_BYTES) {
        await reader.cancel()
        break
      }
    }
  }
  return new TextDecoder("utf-8").decode(concat(chunks))
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

/** Picks the first non-empty string from the candidates, trimmed. */
function firstText(...vals: (string | undefined | null)[]): string | null {
  for (const v of vals) {
    const t = v?.trim()
    if (t) return t
  }
  return null
}

interface SiteExtract {
  title?: string | null
  image?: string | null
  price?: string | null
  description?: string | null
}

/** Pulls the first usable image URL out of a schema.org `image` value. */
function jsonLdImage(img: unknown): string | null {
  if (!img) return null
  if (typeof img === "string") return img.trim() || null
  if (Array.isArray(img)) {
    for (const item of img) {
      const found = jsonLdImage(item)
      if (found) return found
    }
    return null
  }
  if (typeof img === "object") {
    const url = (img as Record<string, unknown>).url ?? (img as Record<string, unknown>)["@id"]
    return typeof url === "string" ? url.trim() || null : null
  }
  return null
}

/** Pulls a price out of a schema.org `offers` value (Offer / AggregateOffer). */
function jsonLdPrice(offers: unknown): string | null {
  if (!offers) return null
  const list = Array.isArray(offers) ? offers : [offers]
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue
    const o = offer as Record<string, unknown>
    const spec = (o.priceSpecification as Record<string, unknown>) ?? {}
    const p = o.price ?? o.lowPrice ?? spec.price ?? spec.lowPrice
    if (p != null && p !== "") return String(p)
  }
  return null
}

/** Recursively collects schema.org Product nodes from parsed JSON-LD. */
function collectProducts(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== "object") return
  if (Array.isArray(node)) {
    for (const n of node) collectProducts(n, out)
    return
  }
  const obj = node as Record<string, unknown>
  const type = obj["@type"]
  const isProduct =
    type === "Product" || (Array.isArray(type) && type.includes("Product"))
  if (isProduct) out.push(obj)
  if (obj["@graph"]) collectProducts(obj["@graph"], out)
}

/**
 * Reads schema.org/Product structured data (JSON-LD), the web standard many
 * retailers embed for Google rich results. When present it yields a clean
 * name, image, price, and description in one shot — the most reliable
 * cross-site source, and often the only place a price is exposed.
 */
function extractJsonLd($: CheerioAPI): SiteExtract {
  const products: Record<string, unknown>[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text()
    if (!raw) return
    try {
      collectProducts(JSON.parse(raw), products)
    } catch {
      /* ignore malformed JSON-LD blocks */
    }
  })
  const product = products.find((p) => typeof p.name === "string") ?? products[0]
  if (!product) return {}
  return {
    title: typeof product.name === "string" ? product.name.trim() || null : null,
    image: jsonLdImage(product.image),
    price: jsonLdPrice(product.offers),
    description:
      typeof product.description === "string" ? product.description.trim() || null : null,
  }
}

/** True for amazon.com and its regional domains, plus amzn.to short links. */
function isAmazonHost(hostname: string): boolean {
  return /(^|\.)(amazon\.[a-z.]+|amzn\.[a-z.]+)$/i.test(hostname)
}

/**
 * Amazon's `data-a-dynamic-image` attribute is a JSON map of image URL → [w, h].
 * Returns the URL with the greatest width, or null if it can't be parsed.
 */
function largestDynamicImage(json: string | undefined): string | null {
  if (!json) return null
  try {
    const map = JSON.parse(json) as Record<string, [number, number]>
    let best: string | null = null
    let bestWidth = -1
    for (const [imgUrl, dims] of Object.entries(map)) {
      const width = Array.isArray(dims) ? dims[0] : 0
      if (width > bestWidth) {
        bestWidth = width
        best = imgUrl
      }
    }
    return best
  } catch {
    return null
  }
}

/**
 * Amazon product pages ship generic/near-empty Open Graph tags but hold the
 * real title and image in the DOM, so we read those directly. `og:description`
 * is also generic (literally just "Amazon"), so description comes from the
 * standard `meta[name=description]` tag instead, which carries real per-product
 * copy. Price is usually lazy-loaded via a later AJAX call and is absent from
 * the initial HTML — we grab it only when present and otherwise leave it for
 * manual entry.
 */
function extractAmazon($: CheerioAPI): SiteExtract {
  const title = $("#productTitle").first().text().trim() || null

  const landing = $("#landingImage, #imgBlkFront, #main-image, #ebooksImgBlkFront").first()
  const image =
    landing.attr("data-old-hires")?.trim() ||
    largestDynamicImage(landing.attr("data-a-dynamic-image")) ||
    landing.attr("src")?.trim() ||
    null

  const price =
    $("#corePriceDisplay_desktop_feature_div span.a-offscreen").first().text().trim() ||
    $("#corePrice_feature_div span.a-offscreen").first().text().trim() ||
    $("#apex_desktop span.a-offscreen").first().text().trim() ||
    $("span.a-price span.a-offscreen").first().text().trim() ||
    $("#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice")
      .first()
      .text()
      .trim() ||
    null

  const description = $('meta[name="description"]').attr("content")?.trim() || null

  return { title, image, price, description }
}

/**
 * A scraped price as the gift form shows it: a bare number, whole dollars without cents ("140"
 * for "140.0" or "$140.00") and anything else with two ("34.50"). Null when there is no number.
 */
export function tidyPrice(raw: string | null | undefined): string | null {
  const match = raw?.replace(/,/g, "").match(/\d+(\.\d+)?/)
  if (!match) return null
  const n = Number(match[0])
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/**
 * Fetches a product page and extracts a best-effort title, image, price, and
 * description. Uses site-specific extraction for known retailers (currently
 * Amazon) and falls back to Open Graph / Twitter Card / standard meta tags.
 */
export async function scrapeGift(rawUrl: string): Promise<ScrapedGift> {
  const url = await assertSafeUrl(rawUrl)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res: Response
  let finalUrl: URL
  try {
    ;({ res, finalUrl } = await fetchFollowingRedirects(url, controller.signal))
  } catch (err) {
    if (err instanceof ScrapeError) throw err
    if (err instanceof Error && err.name === "AbortError") {
      throw new ScrapeError("The site took too long to respond.", 504)
    }
    throw new ScrapeError("Couldn't reach that site.", 502)
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    throw new ScrapeError(
      `The site returned an error (${res.status}). You can still enter details manually.`,
      502
    )
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("html")) {
    throw new ScrapeError("That link isn't a web page we can read.", 415)
  }

  const html = await readCapped(res)
  const $ = load(html)

  // Prefer the final (post-redirect) host so amzn.to short links are detected.
  const site: SiteExtract = isAmazonHost(finalUrl.hostname) ? extractAmazon($) : {}
  const ld = extractJsonLd($)

  const meta = (selector: string) => $(selector).attr("content")?.trim()

  const title = firstText(
    site.title,
    ld.title,
    meta('meta[property="og:title"]'),
    meta('meta[name="twitter:title"]'),
    meta('meta[name="title"]'),
    $("title").first().text(),
    $("h1").first().text()
  )

  const rawImage = firstText(
    site.image,
    ld.image,
    meta('meta[property="og:image:secure_url"]'),
    meta('meta[property="og:image:url"]'),
    meta('meta[property="og:image"]'),
    meta('meta[name="twitter:image"]'),
    meta('meta[name="twitter:image:src"]'),
    $('link[rel="image_src"]').attr("href")
  )

  // Prefer the concise OG/meta description over JSON-LD's (often very long) one.
  const rawDescription = firstText(
    site.description,
    meta('meta[property="og:description"]'),
    meta('meta[name="twitter:description"]'),
    meta('meta[name="description"]'),
    ld.description
  )

  const rawPrice = firstText(
    site.price,
    ld.price,
    meta('meta[property="product:price:amount"]'),
    meta('meta[property="og:price:amount"]'),
    meta('meta[itemprop="price"]'),
    $('[itemprop="price"]').attr("content"),
    $('[itemprop="price"]').first().text()
  )

  // Resolve a relative image URL against the final page URL.
  let image_url: string | null = null
  if (rawImage) {
    try {
      image_url = new URL(rawImage, finalUrl.href).href
    } catch {
      image_url = null
    }
  }

  const price = tidyPrice(rawPrice)

  // Cap description to the gift form's 1000-char limit so auto-fill never
  // produces a value that fails validation on save.
  const description =
    rawDescription && rawDescription.length > 1000
      ? rawDescription.slice(0, 997).trimEnd() + "…"
      : rawDescription

  return { title, image_url, price, description }
}
