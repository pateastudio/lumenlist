// Which environment this is. Anything but an explicit "prod" or "staging" is dev, so a local
// checkout or a misconfigured Lambda can never act like prod.
export function appEnv(): "prod" | "staging" | "dev" {
  const v = process.env.APP_ENV
  return v === "prod" || v === "staging" ? v : "dev"
}
