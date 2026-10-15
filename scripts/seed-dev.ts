// Dev-only demo family: "The Harper Family", six verified users, gifts and claims in every state.
//
//   pnpm db:seed:dev
//
// Writes through the e2e seam's connections (E2E_DATABASE_URL owner, E2E_APP_DATABASE_URL), read
// from the environment or .env.local, and refuses anything but the dev branch (seed/guard.ts, which
// reuses the e2e guard). Idempotent: it first deletes its own demo users (emails starting
// delivered+demo-, @resend.dev) and their family, then recreates them. Users are made as the e2e
// backend makes them: a Better Auth user (verified) + credential account with a bcrypt hash + profile.
// They share one password: SEED_DEV_PASSWORD if set (a stable one for local use), otherwise a random
// one made for this run. It is printed at the end; nothing in source signs anyone in.
import { randomBytes } from "node:crypto"
import { existsSync } from "node:fs"
import bcrypt from "bcryptjs"
import pg from "pg"
import { assertSeedTarget } from "./seed/guard"
import { assertTestEmail } from "../tests/e2e/support/guard"

if (existsSync(".env.local")) process.loadEnvFile(".env.local")

const FAMILY = "The Harper Family"
const img = (seed: string) => `https://picsum.photos/seed/lumen-${seed}/600/600`

type Claim = "claimed" | "purchased"
type G = { title: string; price?: number; url?: string; note?: string; image?: string; by?: string; claim?: Claim }

// key -> [name, email slug]; sam is the owner and the one you sign in as.
const USERS: Record<string, string> = {
  sam: "Sam Harper", rose: "Grandma Rose", dan: "Dan Harper", maya: "Maya Harper", leo: "Leo Harper", priya: "Aunt Priya",
}
// On their own: no family, no gifts, nothing claimed. What a brand-new sign-up sees (the onboarding tour, #98).
const NEWCOMERS: Record<string, string> = { robin: "Robin Vale" }
const email = (key: string) => {
  const e = `delivered+demo-${key}@resend.dev`
  assertTestEmail(e)
  return e
}

const GIFTS: Record<string, G[]> = {
  rose: [
    { title: "Waffle-knit robe", price: 68, url: "https://www.brooklinen.com/products/waffle-robe", note: "Size medium, in oatmeal or grey. Mine is worn thin.", image: img("robe") },
    { title: "Large-print crossword book", price: 14.99, url: "https://www.amazon.com/dp/1454949295", note: "The Sunday-size ones, with the big squares.", by: "sam", claim: "claimed" },
    { title: "Window bird feeder", price: 32, url: "https://www.amazon.com/dp/B00004SB9M", note: "The clear kind that sticks to the glass, so I can watch from my chair.", image: img("feeder"), by: "sam", claim: "purchased" },
    { title: "Lavender hand cream trio", price: 24, url: "https://www.lochtree.com/products/lavender-hand-cream-trio", by: "dan", claim: "claimed" },
    { title: "Wi-Fi digital photo frame", price: 129.99, url: "https://www.aurorafs.com/products/carver-mat-frame", note: "So the grandkids can send pictures straight to the kitchen.", image: img("frame"), by: "maya", claim: "purchased" },
    { title: "Tulip bulbs, mixed colours", price: 22, url: "https://www.johnscheepersusa.com/tulip-mix", note: "Fifty bulbs would do. I plant them in October." },
  ],
  sam: [
    { title: "Noise-cancelling headphones", price: 249, url: "https://www.sony.com/electronics/headband-headphones/wh-1000xm5", note: "Over-ear, for the commute and the open-plan office.", image: img("headphones"), by: "dan", claim: "claimed" },
    { title: "Gooseneck kettle", price: 45.5, url: "https://www.amazon.com/dp/B07N6N9XQY", note: "Variable temperature if possible.", by: "rose", claim: "purchased" },
    { title: "Merino socks", price: 27, url: "https://www.smartwool.com/products/hike-socks", note: "Size L, grey or navy." },
    { title: "A sourdough cookbook" },
  ],
  dan: [
    { title: "Cast-iron skillet, 12 inch", price: 39.95, url: "https://www.lodgecastiron.com/product/skillet", image: img("skillet"), by: "priya", claim: "claimed" },
    { title: "Trail running socks", price: 18, url: "https://www.rei.com/c/running-socks" },
    { title: "Barbecue thermometer", price: 59, url: "https://www.thermoworks.com/thermapen-one", note: "The fast-read one." },
  ],
  maya: [
    { title: "Watercolour paint set", price: 34.5, url: "https://www.amazon.com/dp/B000XB8B2Q", note: "Twenty-four pans, with a travel tin.", image: img("watercolour"), by: "sam", claim: "claimed" },
    { title: "Sketchbook, 9 by 12", price: 16, url: "https://www.amazon.com/dp/B00006IBBV", by: "sam", claim: "purchased" },
    { title: "Fairy lights for my room", price: 12.99, url: "https://www.amazon.com/dp/B07BWRM8TK", by: "leo", claim: "claimed" },
    { title: "Paperback: A Wrinkle in Time", price: 8.99 },
  ],
  leo: [
    { title: "LEGO Technic bulldozer", price: 79.99, url: "https://www.lego.com/en-us/product/bulldozer", note: "I like the ones with the motor.", image: img("bulldozer"), by: "sam", claim: "claimed" },
    { title: "Soccer ball, size 4", price: 21, url: "https://www.amazon.com/dp/B000BJHZSG", by: "rose", claim: "purchased" },
    { title: "Glow-in-the-dark star stickers", price: 6.5 },
  ],
  priya: [],
}

async function main() {
  const ownerUrl = process.env.E2E_DATABASE_URL, appUrl = process.env.E2E_APP_DATABASE_URL
  assertSeedTarget({ ownerUrl, appUrl, baseURL: process.env.E2E_BASE_URL })
  const db = new pg.Client({ connectionString: ownerUrl })
  await db.connect()
  try {
    await db.query("begin")
    // Clean up only our own: demo users by email prefix, and the families they created.
    const like = "delivered+demo-%@resend.dev"
    await db.query(`delete from families where created_by in (select id from "user" where email like $1)`, [like])
    await db.query(`delete from "user" where email like $1`, [like])

    const password = process.env.SEED_DEV_PASSWORD || randomBytes(15).toString("base64url")
    if (password.length < 8) throw new Error("SEED_DEV_PASSWORD must be at least 8 characters")
    const hash = await bcrypt.hash(password, 10)
    const ids: Record<string, string> = {}
    for (const [key, name] of Object.entries(USERS)) {
      const e = email(key)
      const { rows } = await db.query(`insert into "user" (name, email, email_verified) values ($1, $2, true) returning id`, [name, e])
      ids[key] = rows[0].id
      await db.query(`insert into account (account_id, provider_id, user_id, password) values ($1, 'credential', $2, $3)`, [String(ids[key]), ids[key], hash])
      await db.query(`insert into profiles (id, email, name) values ($1, $2, $3)`, [ids[key], e, name])
    }

    for (const [key, name] of Object.entries(NEWCOMERS)) {
      const e = email(key)
      const { rows } = await db.query(`insert into "user" (name, email, email_verified) values ($1, $2, true) returning id`, [name, e])
      await db.query(`insert into account (account_id, provider_id, user_id, password) values ($1, 'credential', $2, $3)`, [String(rows[0].id), rows[0].id, hash])
      await db.query(`insert into profiles (id, email, name) values ($1, $2, $3)`, [rows[0].id, e, name])
    }

    const { rows: fam } = await db.query(`insert into families (name, created_by) values ($1, $2) returning id`, [FAMILY, ids.sam])
    for (const key of Object.keys(USERS)) {
      await db.query(`insert into family_members (family_id, user_id, role) values ($1, $2, $3)
         on conflict (family_id, user_id) do update set role = excluded.role`, [fam[0].id, ids[key], key === "sam" ? "owner" : "member"]) // a trigger already adds the creator
    }

    let gifts = 0, claims = 0
    for (const [owner, list] of Object.entries(GIFTS)) {
      for (const [i, g] of list.entries()) {
        const { rows } = await db.query(
          `insert into gifts (owner_id, title, description, price, url, image_url, sort_order) values ($1, $2, $3, $4, $5, $6, $7) returning id`,
          [ids[owner], g.title, g.note ?? null, g.price ?? null, g.url ?? null, g.image ?? null, i],
        )
        gifts++
        if (g.by && g.claim) {
          await db.query(`insert into gift_claims (gift_id, claimed_by, status) values ($1, $2, $3)`, [rows[0].id, ids[g.by], g.claim])
          claims++
        }
      }
    }
    await db.query("commit")

    console.log(`Seeded "${FAMILY}": ${Object.keys(USERS).length} users, ${gifts} gifts, ${claims} claims.`)
    console.log(`Sign in as ${email("sam")} with password ${password}`)
    console.log(`Brand-new person with no family: ${email("robin")} (same password)`)
    console.log(`Grandma Rose's list: /members/${ids.rose}`)
  } catch (e) {
    await db.query("rollback").catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
