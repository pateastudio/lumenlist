// The production Neon branch's endpoint id: the first label of its hostname, without "-pooler".
// The e2e guard and the seeds refuse that branch. Set PROD_NEON_ENDPOINT to yours before running
// the e2e suite or a seed against Neon. Unset, the guard refuses every Neon database, so a missing
// value can't let a run through. Under Vitest a stand-in takes its place, so the guard's own unit
// tests have a production branch to refuse.
export const PROD_NEON_ENDPOINT = process.env.PROD_NEON_ENDPOINT ?? (process.env.VITEST ? "ep-stand-in-prod" : "")
