// The database schema. App tables keep the Supabase-era column names and property names, so the
// UI's types don't change. Better Auth's tables use its default property names (camelCase) with
// snake_case columns; Better Auth reads the property names through the Drizzle adapter.
import { sql } from "drizzle-orm"
import { bigint, boolean, check, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" })

// ---- Better Auth ----------------------------------------------------------------------------
export const user = pgTable("user", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_user_id_idx").on(t.userId)])

export const account = pgTable("account", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("account_user_id_idx").on(t.userId)])

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)])

export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  // Milliseconds since the epoch, so it needs 64 bits.
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
})

// ---- App ------------------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  avatar_url: text("avatar_url"),
  created_at: ts("created_at").notNull().defaultNow(),
  updated_at: ts("updated_at").notNull().defaultNow(),
})

export const families = pgTable("families", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  created_by: uuid("created_by").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  // The shareable join code: 32 hex characters, 122 random bits (drizzle/0006). Codes made before
  // 0006 are 12 characters and keep working until the owner resets them (SET invite_code = DEFAULT).
  invite_code: text("invite_code").notNull().unique()
    .default(sql`replace(gen_random_uuid()::text, '-', '')`),
  created_at: ts("created_at").notNull().defaultNow(),
  updated_at: ts("updated_at").notNull().defaultNow(),
})

export const familyMembers = pgTable("family_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  family_id: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
  joined_at: ts("joined_at").notNull().defaultNow(),
}, (t) => [
  unique("family_members_family_id_user_id_key").on(t.family_id, t.user_id),
  index("family_members_user_id_idx").on(t.user_id),
  index("family_members_family_id_idx").on(t.family_id),
])

export const familyInvites = pgTable("family_invites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  family_id: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  invited_by: uuid("invited_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique()
    .default(sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`),
  accepted_at: ts("accepted_at"),
  expires_at: ts("expires_at").notNull().default(sql`now() + interval '7 days'`),
  created_at: ts("created_at").notNull().defaultNow(),
}, (t) => [unique("family_invites_family_id_email_key").on(t.family_id, t.email)])

export const gifts = pgTable("gifts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  owner_id: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }),
  url: text("url"),
  image_url: text("image_url"),
  sort_order: integer("sort_order").notNull().default(0),
  source: text("source"),
  external_id: text("external_id"),
  created_at: ts("created_at").notNull().defaultNow(),
  updated_at: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("gifts_owner_idx").on(t.owner_id)])

export const giftClaims = pgTable("gift_claims", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gift_id: uuid("gift_id").notNull().unique().references(() => gifts.id, { onDelete: "cascade" }),
  claimed_by: uuid("claimed_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["claimed", "purchased"] }).notNull().default("claimed"),
  created_at: ts("created_at").notNull().defaultNow(),
  updated_at: ts("updated_at").notNull().defaultNow(),
})

// One row per person, made the first time the tour records anything; no row means brand new.
// Own-row RLS (drizzle/0005): unlike profiles, nobody else can read it.
export const onboarding = pgTable("onboarding", {
  user_id: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  walk_ended_at: ts("walk_ended_at"),
  walk_outcome: text("walk_outcome", { enum: ["completed", "skipped"] }),
  peeked_at: ts("peeked_at"),
  secret_seen_at: ts("secret_seen_at"),
  hints_read: text("hints_read").array().notNull().default(sql`'{}'::text[]`),
  steps_ended_at: ts("steps_ended_at"),
  steps_outcome: text("steps_outcome", { enum: ["completed", "hidden"] }),
  steps_track: text("steps_track", { enum: ["invited", "solo"] }),
  restarted_at: ts("restarted_at"),
  created_at: ts("created_at").notNull().defaultNow(),
  updated_at: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  check("onboarding_walk_outcome_check", sql`${t.walk_outcome} in ('completed', 'skipped')`),
  check("onboarding_steps_outcome_check", sql`${t.steps_outcome} in ('completed', 'hidden')`),
  check("onboarding_steps_track_check", sql`${t.steps_track} in ('invited', 'solo')`),
])

// Fixed-window counters for the app's own rate limits (src/lib/rate-limit.ts): join previews, joins
// and invite emails. Better Auth's rate_limit covers only /api/auth. No grants and no policies:
// app_user reaches it only through take_rate_limit() (drizzle/0006).
export const appRateLimit = pgTable("app_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  reset_at: ts("reset_at").notNull(),
}, (t) => [index("app_rate_limit_reset_at_idx").on(t.reset_at)])
