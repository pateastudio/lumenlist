-- Join codes and the app's own rate limits (#154). Additive: existing 12-character codes keep
-- working until an owner resets them. A reset is `UPDATE families SET invite_code = DEFAULT`
-- through the existing families_update_owner policy, so it needs no new way past RLS.
CREATE TABLE "app_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "families" ALTER COLUMN "invite_code" SET DEFAULT replace(gen_random_uuid()::text, '-', '');--> statement-breakpoint
CREATE INDEX "app_rate_limit_reset_at_idx" ON "app_rate_limit" USING btree ("reset_at");--> statement-breakpoint
-- No grants and no policies: app_user reaches the counters only through take_rate_limit().
ALTER TABLE app_rate_limit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- One fixed window per key: counts a hit and says whether it is within p_limit, and if not, how
-- many seconds until the window resets. A definer function so signed-out join previews can count
-- too. The DELETE clears long-expired keys now and then; it runs on a call, not at migration time.
CREATE OR REPLACE FUNCTION public.take_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS TABLE (allowed boolean, retry_after integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count integer; v_reset timestamptz;
BEGIN
  IF p_key IS NULL OR p_key = '' OR p_limit < 1 OR p_window_seconds < 1 THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;
  INSERT INTO app_rate_limit AS r (key, count, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.count + 1 END,
    reset_at = CASE WHEN r.reset_at <= now() THEN EXCLUDED.reset_at ELSE r.reset_at END
  RETURNING r.count, r.reset_at INTO v_count, v_reset;
  IF random() < 0.01 THEN DELETE FROM app_rate_limit WHERE reset_at < now() - interval '1 hour'; END IF;
  allowed := v_count <= p_limit;
  retry_after := CASE WHEN allowed THEN 0 ELSE greatest(1, ceil(extract(epoch FROM v_reset - now()))::integer) END;
  RETURN NEXT;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.take_rate_limit(text, integer, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.take_rate_limit(text, integer, integer) TO app_user;
