// Shareable join codes (families.invite_code). New ones are 32 hex characters (drizzle/0006).
// Codes made before that, or set by hand, are 12 letters and digits and keep working until the
// owner resets the link, so both lengths are accepted. Case doesn't matter: people retype them.
const JOIN_CODE = /^(?:[a-z0-9]{12}|[a-z0-9]{32})$/

/** The code in the form the database matches, or null when it can't be a join code. */
export function normalizeJoinCode(raw: string): string | null {
  const code = raw.trim().toLowerCase()
  return JOIN_CODE.test(code) ? code : null
}
