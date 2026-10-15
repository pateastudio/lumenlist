import "server-only"
import { appDb } from "@/lib/db"
import { getSchemaStatus } from "@/lib/migrations/status"
import type { SchemaState } from "@/lib/migrations/plan"

// Is the database at the schema this build expects? Read as app_user, which may read only
// drizzle.__drizzle_migrations (migration 0003).
export function schemaStatus(): Promise<SchemaState> {
  return getSchemaStatus(appDb)
}
