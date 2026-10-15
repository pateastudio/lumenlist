import { randomBytes } from "node:crypto"

// A fresh password for each test user, held in memory for the run. Never a fixed one in source:
// dev and staging are public, so a password in the repo would sign anyone in as the test users.
export function testPassword(): string {
  return randomBytes(15).toString("base64url")
}
