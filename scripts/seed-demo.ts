// The demo video's cast: two made-up families, "The Carters" and "The Sullivans", seven people,
// with Ryan and Megan Carter in both. The one seed that may write to production.
//
//   DEMO_DATABASE_URL="<owner URL, unpooled>" pnpm db:seed:demo [--production] [--new-password] [--remove]
//
// Without DEMO_DATABASE_URL it uses E2E_DATABASE_URL from .env.local (the dev branch). The
// production branch needs --production, and --production needs the production branch
// (seed/guard.ts). Before a production run, take a backup: scripts/backup/dump-neon.sh demo-seed.
//
// Safe to run again between takes: people keep their ids, passwords and sign-ins; their gifts,
// claims and invites are put back to the start. The password is made up on the first run and
// printed once (--new-password makes another). --remove deletes the seven people, their two
// families and everything they own, and nothing else.
import { randomBytes } from "node:crypto"
import { existsSync } from "node:fs"
import bcrypt from "bcryptjs"
import pg from "pg"
import { demoTarget } from "./seed/guard"
import { assertTestEmail } from "../tests/e2e/support/guard"

if (existsSync(".env.local")) process.loadEnvFile(".env.local")

type Claim = "claimed" | "purchased"
type G = { title: string; price: number; url: string; image: string; note?: string; by?: string; claim?: Claim }

// key -> name; ryan is the one the video follows.
const PEOPLE: Record<string, string> = {
  ryan: "Ryan Carter", megan: "Megan Carter", emma: "Emma Carter", linda: "Linda Carter",
  nancy: "Nancy Sullivan", david: "David Sullivan", kevin: "Kevin Sullivan",
}
// The first key of each family owns it.
const FAMILIES: Record<string, string[]> = {
  "The Carters": ["ryan", "megan", "emma", "linda"],
  "The Sullivans": ["nancy", "david", "kevin", "ryan", "megan"],
}
// Not the dev seed's "delivered+demo-" prefix, so `pnpm db:seed:dev` never deletes these on dev.
const email = (key: string) => {
  const e = `delivered+video-${key}@resend.dev`
  assertTestEmail(e)
  return e
}

// Real store pages, so the pictures are what the app's own "Fill it in" would save. A claim is
// only ever between two people who share a family.
const GIFTS: Record<string, G[]> = {
  ryan: [
    { title: "Ooni Pizza Turning Peel", price: 65, url: "https://ooni.com/products/ooni-pizza-turning-peel", image: "https://ooni.com/cdn/shop/files/Turning_Peel_7.webp?v=1776802762&width=2048", note: "The 7 inch one, for the oven on the patio.", by: "kevin", claim: "claimed" },
    { title: "Hiker Micro Crew Hiking Socks", price: 26, url: "https://www.darntough.com/products/mens-limited-edition-hiker-micro-crew-midweight-hiking-socks", image: "https://darntough.com/cdn/shop/files/1466_Mint_1024x1024.png?v=1791203811", note: "Size large. Any color.", by: "megan", claim: "purchased" },
    { title: "The 8\" Knife", price: 105, url: "https://materialkitchen.com/products/the-8-knife", image: "https://materialkitchen.com/cdn/shop/products/8Knife-AlmostBlack_e1b4aa63-831d-489b-96b4-4b0419bad2c0.png?v=1762441382&width=1200", note: "Ours won't cut a tomato any more." },
  ],
  nancy: [
    { title: "Super Fluff Throw Blanket", price: 129, url: "https://www.brooklinen.com/products/super-fluff-throw-blanket", image: "https://www.brooklinen.com/cdn/shop/files/BKL_26-08_Bedding_Throws_Super-Fluff_Cream_1x_PDP_WOgrey.jpg?v=1789583055&width=1200", note: "In cream, for the reading chair." },
    { title: "500 Piece Gradient Puzzle", price: 34, url: "https://www.areaware.com/products/gradient-puzzle-red-yellow", image: "https://www.areaware.com/cdn/shop/files/areaware-gradient-puzzle-500-pieces-angle-pieces_2000x.jpg?v=1788210548", note: "Something for the card table this winter." },
    { title: "Snake Plant", price: 79, url: "https://www.thesill.com/products/snake-plant-fernwood", image: "https://www.thesill.com/cdn/shop/files/the-sill_Medium-Snake-Fernwood_Medium_Isbella-Rose-Gold_Variant.jpg?v=1790349903&width=1200", note: "One I can't kill. For the front hall." },
    { title: "Stitched Notebook Set", price: 19, url: "https://riflepaperco.com/products/stitched-notebook-set-estee", image: "https://riflepaperco.com/cdn/shop/files/j3a014-01_ba460963-392a-48fc-8696-77ae045e01f9_450x450.jpg?v=1762198953" },
    { title: "Midi Cutting Board", price: 44, url: "https://materialkitchen.com/products/the-midi-mk-free-board", image: "https://materialkitchen.com/cdn/shop/files/CloudMidiTransparentPNG.png?v=1771343166&width=1200", note: "The small size.", by: "david", claim: "claimed" },
    { title: "Blackwing Pencils, Set of 12", price: 36, url: "https://www.blackwing602.com/products/blackwing-eras-2026-set-of-12", image: "https://blackwing602.com/cdn/shop/files/BlackwingEras-Fall2026_2_dd7d192b-416a-4539-ba70-9df24c7dbe86.jpg?v=1791383227", note: "For the crossword.", by: "kevin", claim: "purchased" },
  ],
  megan: [
    { title: "Titanium Always Pan Pro", price: 179, url: "https://fromourplace.com/products/titanium-always-pan-pro-10-5-2-0", image: "https://fromourplace.com/cdn/shop/files/chrome-titanium-always-pan-pro-product-thumbnail.jpg?v=1791481233", note: "The 10.5 inch.", by: "ryan", claim: "claimed" },
    { title: "Essential Apron", price: 129, url: "https://hedleyandbennett.com/products/rifle-paper-co-home-sweet-home-essential-apron", image: "https://cdn.shopify.com/s/files/1/0187/0608/files/Rifle-Paper-Co-Home-Sweet-Home-Essential_00057-Square1.jpg?v=1790879998" },
    { title: "Bigtime Robe", price: 199, url: "https://www.brooklinen.com/products/bigtime-robe", image: "https://www.brooklinen.com/cdn/shop/files/BKL_26-08_Bath_Bigtime_Robe_TandemStripeInFrost_Flat_1x_PDP_WOgrey.jpg?v=1789509111&width=1200", note: "Size small to medium.", by: "nancy", claim: "claimed" },
    { title: "Canvas Tote Bag", price: 42, url: "https://riflepaperco.com/products/east-west-canvas-tote-bag-garden-study", image: "https://riflepaperco.com/cdn/shop/files/SGTH01-01_cd541d10-0955-41ed-91dd-b8457b161d85_450x450.jpg?v=1774449102", note: "For the farmers market.", by: "linda", claim: "purchased" },
  ],
  emma: [
    { title: "Glow-in-the-Dark Unicorn Floor Puzzle", price: 24.99, url: "https://www.melissaanddoug.com/products/glow-in-the-dark-unicorn-floor-puzzle", image: "https://www.melissaanddoug.com/cdn/shop/files/30f6cf5312a898914683875c18ce6251be134080_1024x1024.jpg?v=1772466968", by: "ryan", claim: "purchased" },
    { title: "Sun Night Light", price: 35, url: "https://www.areaware.com/products/everybody-night-light-in-yellow", image: "https://www.areaware.com/cdn/shop/files/EverybodyNightLight-PurpleYellow-Silo-01-DDHENLPY_1080x.jpg?v=1738966992", note: "The yellow one, for next to my bed.", by: "linda", claim: "claimed" },
    { title: "Sticker WOW! Deluxe Set", price: 26.99, url: "https://www.melissaanddoug.com/products/sticker-wow-deluxe-set-mickey-minnie", image: "https://www.melissaanddoug.com/cdn/shop/files/d6cd557c7a8014f97293ddb551fb63ad27222fdf_1024x1024.jpg?v=1783530250" },
  ],
  linda: [
    { title: "Super Fluff Pillow Cover", price: 49, url: "https://www.brooklinen.com/products/super-fluff-pillow-cover", image: "https://www.brooklinen.com/cdn/shop/files/BKL_26-08_Bedding_SuperFluff_Cream_Pillow_1x_PDP_WOgrey.jpg?v=1789585965&width=1200", note: "Two would be lovely, but one is plenty.", by: "megan", claim: "claimed" },
    { title: "Orchid Care Duo", price: 19, url: "https://www.thesill.com/products/orchid-care-duo", image: "https://www.thesill.com/cdn/shop/files/the-sill_orchid-care-duo_variant_02.jpg?v=1762476903&width=1200" },
  ],
  david: [
    { title: "Mushroom Foraging Set", price: 50, url: "https://www.opinel-usa.com/products/no-08-mushroom-knife-with-brush-foraging-guide", image: "https://www.opinel-usa.com/cdn/shop/files/Beech_wood_600x.jpg?v=1790100803", note: "For the woods behind the house.", by: "ryan", claim: "claimed" },
    { title: "Pen and Notebook Set", price: 95, url: "https://www.baronfig.com/products/squire-hex-pen-confidant-classic-journal", image: "https://baronfig.com/cdn/shop/files/starter-set_confidant-hex_buy-square_pen-blackout_confidant-charcoal_variant_01.jpg?v=1777575566" },
    { title: "Vintage Trucker Hat", price: 24, url: "https://www.cotopaxi.com/products/vintage-trucker-hat-3", image: "https://www.cotopaxi.com/cdn/shop/files/1200x1200png-S26UVintageTruckerHatAzure_F.png?v=1769609687", note: "The blue one.", by: "nancy", claim: "claimed" },
  ],
  kevin: [
    { title: "Original Puffy Blanket", price: 99.95, url: "https://rumpl.com/products/original-puffy-blanket-cascade-fade", image: "https://www.rumpl.com/cdn/shop/files/rumpl-printed-original-1-person-original-puffy-blanket-cascade-fade-ru01013311p-1193687892_450x450.png?v=1758240401", note: "For camping. Cascade Fade." },
    { title: "Rayu Rain Jacket", price: 75, url: "https://www.cotopaxi.com/products/rayu-rain-jacket-mens-1", image: "https://www.cotopaxi.com/cdn/shop/files/1200x1200png-S26MRayuRainJacketSteelBlueandEverglade_01.png?v=1769462700", note: "Men's medium.", by: "megan", claim: "claimed" },
    { title: "Todo 2L Hip Pack", price: 35, url: "https://www.cotopaxi.com/products/todo-2l-hip-pack-4", image: "https://www.cotopaxi.com/cdn/shop/files/1200x1200png-S26UTodo2LHipPack-CadaDiaAster_F.png?v=1769357919" },
  ],
}

async function main() {
  const ownerUrl = process.env.DEMO_DATABASE_URL || process.env.E2E_DATABASE_URL
  const target = demoTarget({ ownerUrl, production: process.argv.includes("--production") })
  const emails = Object.keys(PEOPLE).map(email)
  const db = new pg.Client({ connectionString: ownerUrl })
  await db.connect()
  try {
    await db.query("begin")

    if (process.argv.includes("--remove")) {
      // Only ours: the seven people by exact email, and the families they made.
      const fam = await db.query(`delete from families where created_by in (select id from "user" where email = any($1))`, [emails])
      const usr = await db.query(`delete from "user" where email = any($1)`, [emails])
      await db.query("commit")
      console.log(`Removed ${usr.rowCount} people and ${fam.rowCount} families from ${target === "prod" ? "PRODUCTION" : "a non-production branch"}.`)
      return
    }

    const password = randomBytes(15).toString("base64url")
    const hash = await bcrypt.hash(password, 10)
    const ids: Record<string, string> = {}
    let made = 0
    for (const [key, name] of Object.entries(PEOPLE)) {
      const e = email(key)
      const found = await db.query(`select id from "user" where email = $1`, [e])
      if (found.rows[0]) { ids[key] = found.rows[0].id; continue }
      // As the e2e backend makes them: a verified Better Auth user, a credential account, a profile.
      const { rows } = await db.query(`insert into "user" (name, email, email_verified) values ($1, $2, true) returning id`, [name, e])
      ids[key] = rows[0].id
      await db.query(`insert into account (account_id, provider_id, user_id, password) values ($1, 'credential', $2, $3)`, [String(ids[key]), ids[key], hash])
      await db.query(`insert into profiles (id, email, name) values ($1, $2, $3)`, [ids[key], e, name])
      made++
    }
    const all = Object.values(ids)
    const fresh = made > 0 || process.argv.includes("--new-password")
    if (fresh) await db.query(`update account set password = $1, updated_at = now() where provider_id = 'credential' and user_id = any($2)`, [hash, all])

    // The tour is over for everyone, so the video never meets the walk or First Steps.
    await db.query(
      `insert into onboarding (user_id, walk_ended_at, walk_outcome, steps_ended_at, steps_outcome)
       select id, now(), 'skipped', now(), 'hidden' from unnest($1::uuid[]) as id
       on conflict (user_id) do update set walk_ended_at = now(), walk_outcome = 'skipped', steps_ended_at = now(), steps_outcome = 'hidden', updated_at = now()`,
      [all],
    )

    const familyIds: Record<string, string> = {}
    for (const [name, members] of Object.entries(FAMILIES)) {
      const owner = ids[members[0]]
      const found = await db.query(`select id from families where name = $1 and created_by = $2`, [name, owner])
      familyIds[name] = found.rows[0]?.id ?? (await db.query(`insert into families (name, created_by) values ($1, $2) returning id`, [name, owner])).rows[0].id
      const want = members.map((k) => ids[k])
      await db.query(`delete from family_members where family_id = $1 and user_id <> all($2)`, [familyIds[name], want])
      for (const id of want) {
        await db.query(`insert into family_members (family_id, user_id, role) values ($1, $2, $3)
           on conflict (family_id, user_id) do update set role = excluded.role`, [familyIds[name], id, id === owner ? "owner" : "member"]) // a trigger already adds the creator
      }
      await db.query(`delete from family_invites where family_id = $1`, [familyIds[name]])
    }

    // Back to the start: whatever a take added, claimed or bought goes with the old gifts.
    await db.query(`delete from gift_claims where claimed_by = any($1)`, [all])
    await db.query(`delete from gifts where owner_id = any($1)`, [all])
    let gifts = 0, claims = 0
    for (const [owner, list] of Object.entries(GIFTS)) {
      for (const [i, g] of list.entries()) {
        const { rows } = await db.query(
          `insert into gifts (owner_id, title, description, price, url, image_url, sort_order, source) values ($1, $2, $3, $4, $5, $6, $7, 'manual') returning id`,
          [ids[owner], g.title, g.note ?? null, g.price, g.url, g.image, i],
        )
        gifts++
        if (g.by && g.claim) {
          // A minute apart: Home orders claims by time alone, and equal times swap places between loads (#111).
          await db.query(`insert into gift_claims (gift_id, claimed_by, status, created_at) values ($1, $2, $3, now() - make_interval(mins => $4))`, [rows[0].id, ids[g.by], g.claim, claims])
          claims++
        }
      }
    }
    await db.query("commit")

    console.log(`Seeded ${Object.keys(FAMILIES).join(" and ")} on ${target === "prod" ? "PRODUCTION" : "a non-production branch"}: ${all.length} people (${made} new), ${gifts} gifts, ${claims} claims.`)
    console.log(fresh ? `Password for all seven (shown once): ${password}` : "Passwords unchanged (--new-password makes a new one).")
    console.log(`Sign in as ${email("ryan")}, ${email("nancy")} and ${email("linda")}`)
    console.log(`Nancy's list, as Ryan: /members/${ids.nancy}?familyId=${familyIds["The Sullivans"]}`)
    console.log(`Ryan's list, as Linda: /members/${ids.ryan}?familyId=${familyIds["The Carters"]}`)
  } catch (e) {
    await db.query("rollback").catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
