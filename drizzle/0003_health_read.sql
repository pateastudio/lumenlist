-- The deep health check (/api/health) reads which migrations are applied, as app_user. This is
-- the only thing app_user may read outside the app tables.
GRANT USAGE ON SCHEMA drizzle TO app_user;
--> statement-breakpoint
GRANT SELECT ON drizzle.__drizzle_migrations TO app_user;
