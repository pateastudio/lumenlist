// auth.users (Supabase) into Better Auth's user and account rows. Same UUIDs; the bcrypt hash is
// carried byte for byte, so every user keeps their password.

type Row = Record<string, string | null>

export type BetterAuthUser = { id: string; name: string; email: string; email_verified: boolean; created_at: string; updated_at: string }
export type BetterAuthAccount = { account_id: string; provider_id: "credential"; user_id: string; password: string; created_at: string; updated_at: string }

function metadataName(raw: string | null): string | null {
  if (!raw) return null
  try {
    const name = (JSON.parse(raw) as { name?: unknown }).name
    return typeof name === "string" && name.trim() ? name.trim() : null
  } catch {
    return null
  }
}

export function mapAuthUsers(users: Row[], profiles: Row[]) {
  const profileName = new Map(profiles.map((p) => [p.id, p.name]))
  const out = { users: [] as BetterAuthUser[], accounts: [] as BetterAuthAccount[], problems: [] as string[] }
  for (const u of users) {
    const id = u.id!, email = u.email!
    const hash = u.encrypted_password
    if (!hash || !/^\$2[aby]\$/.test(hash)) {
      out.problems.push(`${id}: no bcrypt password hash`)
      continue
    }
    const name = metadataName(u.raw_user_meta_data) ?? (profileName.get(id)?.trim() || null) ?? email
    out.users.push({ id, name, email, email_verified: u.email_confirmed_at !== null, created_at: u.created_at!, updated_at: u.updated_at ?? u.created_at! })
    out.accounts.push({ account_id: id, provider_id: "credential", user_id: id, password: hash, created_at: u.created_at!, updated_at: u.updated_at ?? u.created_at! })
  }
  return out
}
