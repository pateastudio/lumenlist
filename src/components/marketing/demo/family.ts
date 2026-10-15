import type { Gift, GiftWithClaim } from "@/types"

// The made-up Harper family for the marketing page. No database, no session, nothing from a real
// family. The visitor plays Sam.

export type DemoPerson = { id: string; key: string; name: string }

export const FAMILY_NAME = "The Harper Family"

export const PEOPLE = {
  sam: { id: "demo-sam", key: "sam", name: "Sam Harper" },
  nora: { id: "demo-nora", key: "nora", name: "Nora Harper" },
  dan: { id: "demo-dan", key: "dan", name: "Dan Harper" },
  maya: { id: "demo-maya", key: "maya", name: "Maya Harper" },
  leo: { id: "demo-leo", key: "leo", name: "Leo Harper" },
  priya: { id: "demo-priya", key: "priya", name: "Aunt Priya" },
} as const satisfies Record<string, DemoPerson>

export type PersonKey = keyof typeof PEOPLE

/** The visitor. Claims they make in a preview are Sam's. */
export const VIEWER = PEOPLE.sam

/**
 * A gift's picture: an emoji as an SVG data URI, so the real cards need no network and no photo
 * rights. To use product photos later, give a gift an `image` path here instead of an `emoji`.
 */
export function emojiImage(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><text x="60" y="64" font-size="68" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

type Seed = { title: string; emoji: string; price?: number; url?: string; note?: string; by?: PersonKey; claim?: "claimed" | "purchased" }

const SEED: Record<PersonKey, Seed[]> = {
  nora: [
    { title: "Waffle-knit robe", emoji: "🧖‍♀️", price: 68, url: "https://www.brooklinen.com/products/waffle-robe", note: "Size medium, in oatmeal or gray. Mine is worn thin." },
    { title: "Sunday crossword collection", emoji: "✏️", price: 14.99, url: "https://www.amazon.com/dp/1454949295", note: "The big Sunday-size ones. In pen, obviously." },
    { title: "Window bird feeder", emoji: "🐦", price: 32, url: "https://www.amazon.com/dp/B00004SB9M", note: "The clear kind that sticks to the glass, so I can watch from the kitchen table.", by: "sam", claim: "claimed" },
    { title: "Lavender hand cream trio", emoji: "🪻", price: 24, url: "https://www.target.com/p/lavender-hand-cream-trio", by: "dan", claim: "claimed" },
    { title: "Wi-Fi digital photo frame", emoji: "🖼️", price: 129.99, url: "https://www.aurorafs.com/products/carver-mat-frame", note: "So everyone can send pictures straight to the kitchen.", by: "maya", claim: "purchased" },
    { title: "Tulip bulbs, mixed colors", emoji: "🌷", price: 22, url: "https://www.homedepot.com/tulip-mix", note: "Fifty bulbs would do. I plant them in October." },
  ],
  sam: [
    { title: "Noise-canceling headphones", emoji: "🎧", price: 249, url: "https://www.sony.com/electronics/headband-headphones/wh-1000xm5", note: "Over-ear, for the commute and the open-plan office.", by: "dan", claim: "claimed" },
    { title: "Gooseneck kettle", emoji: "🫖", price: 45.5, url: "https://www.amazon.com/dp/B07N6N9XQY", note: "Variable temperature if possible.", by: "nora", claim: "purchased" },
    { title: "Merino socks", emoji: "🧦", price: 27, url: "https://www.smartwool.com/products/hike-socks", note: "Size L, gray or navy." },
    { title: "A sourdough cookbook", emoji: "🍞" },
  ],
  dan: [
    { title: "Cast-iron skillet, 12 inch", emoji: "🍳", price: 39.95, url: "https://www.lodgecastiron.com/product/skillet", by: "priya", claim: "claimed" },
    { title: "Trail running socks", emoji: "🏃", price: 18, url: "https://www.rei.com/c/running-socks" },
    { title: "Barbecue thermometer", emoji: "🌡️", price: 59, url: "https://www.thermoworks.com/thermapen-one", note: "The fast-read one." },
  ],
  maya: [
    { title: "Watercolor paint set", emoji: "🎨", price: 34.5, url: "https://www.amazon.com/dp/B000XB8B2Q", note: "Twenty-four pans, with a travel tin.", by: "sam", claim: "claimed" },
    { title: "Sketchbook, 9 by 12", emoji: "📓", price: 16, url: "https://www.amazon.com/dp/B00006IBBV", by: "sam", claim: "purchased" },
    { title: "Fairy lights for my room", emoji: "✨", price: 12.99, url: "https://www.amazon.com/dp/B07BWRM8TK", by: "leo", claim: "claimed" },
    { title: "Paperback: A Wrinkle in Time", emoji: "📖", price: 8.99 },
  ],
  leo: [
    { title: "LEGO Technic bulldozer", emoji: "🚜", price: 79.99, url: "https://www.lego.com/en-us/product/bulldozer", note: "I like the ones with the motor." },
    { title: "Soccer ball, size 4", emoji: "⚽", price: 21, url: "https://www.amazon.com/dp/B000BJHZSG", by: "nora", claim: "purchased" },
    { title: "Glow-in-the-dark star stickers", emoji: "🌟", price: 6.5 },
  ],
  priya: [],
}

const AT = "2026-10-01T12:00:00.000Z"

const giftId = (owner: PersonKey, index: number) => `demo-gift-${owner}-${index}`

/** The id of the gift `owner` has with this title, taken from the seed itself so it cannot drift. */
function idOf(owner: PersonKey, title: string): string {
  const i = SEED[owner].findIndex((g) => g.title === title)
  if (i < 0) throw new Error(`no demo gift "${title}" on ${owner}'s list`)
  return giftId(owner, i)
}

/** Nora's gifts that the page points at by name. */
export const GIFT = {
  robe: idOf("nora", "Waffle-knit robe"),
  feeder: idOf("nora", "Window bird feeder"),
  cream: idOf("nora", "Lavender hand cream trio"),
  tulips: idOf("nora", "Tulip bulbs, mixed colors"),
} as const

/** Every demo gift, in list order, shaped exactly like `listGiftsWithClaims` rows. */
export function initialGifts(): GiftWithClaim[] {
  return (Object.keys(SEED) as PersonKey[]).flatMap((owner) =>
    SEED[owner].map((g, i): GiftWithClaim => {
      const id = giftId(owner, i)
      return {
        id,
        owner_id: PEOPLE[owner].id,
        title: g.title,
        description: g.note ?? null,
        price: g.price ?? null,
        url: g.url ?? null,
        image_url: emojiImage(g.emoji),
        sort_order: i,
        source: "manual",
        external_id: null,
        created_at: AT,
        updated_at: AT,
        gift_claims: g.by && g.claim ? { id: `demo-claim-${owner}-${i}`, gift_id: id, claimed_by: PEOPLE[g.by].id, status: g.claim, created_at: AT, updated_at: AT } : null,
      }
    }),
  )
}

/** Someone's list as their family sees it, claims included. */
export function giftsOf(gifts: GiftWithClaim[], owner: PersonKey): GiftWithClaim[] {
  return gifts.filter((g) => g.owner_id === PEOPLE[owner].id)
}

/** A list as its owner sees it: only a gift's own columns, named one by one, so a claim can never ride along. */
export function ownGiftsOf(gifts: GiftWithClaim[], owner: PersonKey): Gift[] {
  return giftsOf(gifts, owner).map(
    (g): Gift => ({
      id: g.id,
      owner_id: g.owner_id,
      title: g.title,
      description: g.description,
      price: g.price,
      url: g.url,
      image_url: g.image_url,
      sort_order: g.sort_order,
      source: g.source,
      external_id: g.external_id,
      created_at: g.created_at,
      updated_at: g.updated_at,
    }),
  )
}

/** What the visitor has said they will get. */
export function shoppingOf(gifts: GiftWithClaim[]): GiftWithClaim[] {
  return gifts.filter((g) => g.gift_claims?.claimed_by === VIEWER.id)
}

/**
 * What the claim API would do, in memory, for the visitor: POST claims an open gift, PATCH sets
 * the status of their own claim, DELETE lets their own claim go. Anything else changes nothing,
 * so a gift someone else has can never be taken and a repeated tap does no harm.
 */
export function applyClaim(
  gifts: GiftWithClaim[],
  giftId: string,
  method: "POST" | "PATCH" | "DELETE",
  status: "claimed" | "purchased" | undefined,
  at: string,
): GiftWithClaim[] {
  return gifts.map((g) => {
    if (g.id !== giftId) return g
    const claim = g.gift_claims
    const mine = claim?.claimed_by === VIEWER.id
    if (method === "POST") {
      return claim ? g : { ...g, gift_claims: { id: `demo-claim-${g.id}`, gift_id: g.id, claimed_by: VIEWER.id, status: "claimed", created_at: at, updated_at: at } }
    }
    if (!claim || !mine) return g
    if (method === "DELETE") return { ...g, gift_claims: null }
    return { ...g, gift_claims: { ...claim, status: status ?? "claimed", updated_at: at } }
  })
}
