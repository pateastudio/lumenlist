import { z } from "zod"

// True for an absolute http: or https: address. `new URL` parses it the way a browser will, so
// "javascript:", "data:" and "httpfoo" fail where a prefix check would let them through.
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

// Where to send someone after they sign in or confirm their email (`?next=`). Only a path on
// this site: it starts with one "/", never "//" or "/\" (both mean another host to a browser),
// and holds no whitespace or control characters (browsers drop tabs and newlines, so "/\t/x"
// would become "//x"). The final check resolves it against a placeholder origin and makes sure
// it stayed there.
const PLACEHOLDER_ORIGIN = "http://lumenlist.invalid"
export const nextPathSchema = z
  .string()
  .refine(
    (val) =>
      val.startsWith("/") &&
      !val.startsWith("//") &&
      !val.startsWith("/\\") &&
      !/\s/.test(val) &&
      ![...val].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f),
    "Must be a path on this site",
  )
  .refine((val) => {
    try {
      return new URL(val, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN
    } catch {
      return false
    }
  }, "Must be a path on this site")

/** The `next` param if it is a safe path on this site, otherwise `fallback`. */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  const parsed = nextPathSchema.safeParse(value)
  return parsed.success ? parsed.data : fallback
}

// The longest name a person or a family can have. The server enforces it too: the API routes
// parse with these schemas, and Better Auth checks a person's name (src/lib/auth/server.ts).
export const NAME_MAX = 100

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(NAME_MAX),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const createFamilySchema = z.object({
  name: z.string().min(1, "Family name is required").max(NAME_MAX),
})

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export const scrapeUrlSchema = z.object({
  url: z
    .string()
    .min(1, "A URL is required")
    .refine((val) => /^https?:\/\//i.test(val), "URL must start with http(s)://"),
})

export const giftSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  price: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      "Price must be a number"
    ),
  url: z
    .string()
    .optional()
    .refine(
      (val) => !val || isHttpUrl(val),
      "URL must be an http or https link"
    ),
  image_url: z
    .string()
    .optional()
    .refine(
      (val) => !val || isHttpUrl(val),
      "Image URL must be an http or https link"
    ),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type CreateFamilyInput = z.infer<typeof createFamilySchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type GiftInput = z.infer<typeof giftSchema>
export type ScrapeUrlInput = z.infer<typeof scrapeUrlSchema>

// One thing that happened in the onboarding tour (PATCH /api/onboarding). The server sets every
// timestamp; a client can only say which event. Unknown keys are dropped.
export const tourEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("walk_completed") }),
  z.object({ event: z.literal("walk_skipped") }),
  z.object({ event: z.literal("steps_shown"), track: z.enum(["invited", "solo"]) }),
  z.object({ event: z.literal("peeked") }),
  z.object({ event: z.literal("secret_seen") }),
  z.object({ event: z.literal("hint_read"), id: z.enum(["add", "dibs", "invite"]) }),
  z.object({ event: z.literal("steps_completed") }),
  z.object({ event: z.literal("steps_hidden") }),
  z.object({ event: z.literal("restart") }),
])
export type TourEvent = z.infer<typeof tourEventSchema>
