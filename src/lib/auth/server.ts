import "server-only"
import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import bcrypt from "bcryptjs"
import { sql } from "drizzle-orm"
import { authDb } from "@/lib/db"
import * as schema from "@/db/schema"
import { inBackground } from "@/lib/background"
import { CLIENT_IP_HEADER } from "@/lib/client-ip"
import { appEnv } from "@/lib/environment"
import { sendAlreadyRegisteredEmail, sendConfirmationEmail, sendPasswordResetEmail } from "@/lib/resend"
import { NAME_MAX } from "@/lib/validations"

const DAY = 60 * 60 * 24
const NAMED_PATHS = new Set(["/sign-up/email", "/update-user"])

// Self-hosted auth (spec D3, P3, P7). Talks to Neon as auth_service, which can't see app data.
export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(authDb, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification, rateLimit: schema.rateLimit },
  }),
  advanced: {
    database: { generateId: "uuid" },
    // Set by the /api/auth route from CloudFront's viewer address, never by the client.
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    // Better Auth's own deferred work runs after the response too.
    backgroundTasks: { handler: (promise) => inBackground("better-auth task", () => promise) },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // also makes sign-up answer the same for existing emails
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
    // Sends run after the response, so its timing can't reveal whether an account exists.
    sendResetPassword: async ({ user, url }) => {
      inBackground("password reset email", () => sendPasswordResetEmail({ to: user.email, resetUrl: url }))
    },
    // A repeat sign-up answers exactly like a new one. By email: an account that was never
    // confirmed gets a fresh confirmation link (verification links expire after an hour, and this
    // is the obvious thing to retry); a confirmed one gets "you already have an account".
    onExistingUserSignUp: async ({ user }) => {
      if (!user.emailVerified) {
        inBackground("repeat sign-up verification email", () =>
          auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: "/dashboard" } }),
        )
        return
      }
      inBackground("already registered email", () =>
        sendAlreadyRegisteredEmail({ to: user.email, resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/forgot-password` }),
      )
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Signing in before confirming sends a fresh link (and the form says to check email).
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      inBackground("verification email", () => sendConfirmationEmail({ to: user.email, name: user.name, confirmUrl: url }))
    },
  },
  session: {
    expiresIn: 30 * DAY,
    updateAge: DAY,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Prod only. Dev and staging see only Patrick and the e2e suite, which signs in many times a
  // minute from one address; the default sign-in limit is 3 per 10 seconds per IP.
  rateLimit: { enabled: appEnv() === "prod", storage: "database" },
  // Better Auth takes any length of name, and the form's limit is only in the browser. Checked
  // before Better Auth looks up the email, so the answer can't tell whether an account exists.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!NAMED_PATHS.has(ctx.path)) return
      const name: unknown = ctx.body?.name
      if (typeof name === "string" && name.length > NAME_MAX) {
        throw new APIError("BAD_REQUEST", { message: `Name must be ${NAME_MAX} characters or fewer` })
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await authDb.execute(sql`insert into profiles (id, email, name) values (${user.id}, ${user.email}, ${user.name ?? ""}) on conflict (id) do nothing`)
        },
      },
      update: {
        after: async (user) => {
          await authDb.execute(sql`update profiles set email = ${user.email}, name = ${user.name ?? ""}, updated_at = now() where id = ${user.id}`)
        },
      },
    },
  },
  plugins: [nextCookies()], // last
})
