-- Roles, grants, the auth.uid() shim, RLS and the definer functions. Ported from Supabase
-- migrations 0001-0005 (checked against prod's schema in the 2026-10-08 nightly backup).
-- `TO authenticated` became `TO app_user`. One deliberate change: profiles_select requires a user
-- (Supabase's was USING (true) for any signed-in user; here app_user with no user set must see nothing).

-- Roles. NOLOGIN here; scripts/db/provision-roles.sh gives them passwords per branch.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_service') THEN CREATE ROLE auth_service NOLOGIN; END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_user, auth_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, families, family_members, family_invites, gifts, gift_claims TO app_user;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, verification, rate_limit TO auth_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE (email, name, updated_at) ON profiles TO auth_service;
--> statement-breakpoint

-- Checks Supabase had.
ALTER TABLE family_members ADD CONSTRAINT family_members_role_check CHECK (role IN ('owner', 'member'));
--> statement-breakpoint
ALTER TABLE gift_claims ADD CONSTRAINT gift_claims_status_check CHECK (status IN ('claimed', 'purchased'));
--> statement-breakpoint

-- The shim: who the current transaction acts for. withUser() sets app.user_id with
-- set_config(..., true), so it is transaction-local and safe behind a pooler.
CREATE SCHEMA IF NOT EXISTS auth;
--> statement-breakpoint
GRANT USAGE ON SCHEMA auth TO app_user, auth_service;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;
--> statement-breakpoint

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gift_claims ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Membership check without policy recursion (Supabase 0002).
CREATE OR REPLACE FUNCTION public.is_family_member(_family_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = _family_id AND fm.user_id = _user_id)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_family_member(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO app_user;
--> statement-breakpoint

-- profiles
CREATE POLICY profiles_select ON profiles FOR SELECT TO app_user USING (auth.uid() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO app_user USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
--> statement-breakpoint
-- Better Auth's user hooks keep profiles in step with "user".
CREATE POLICY profiles_auth_service ON profiles TO auth_service USING (true) WITH CHECK (true);
--> statement-breakpoint

-- families
CREATE POLICY families_select_members ON families FOR SELECT TO app_user
  USING (EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = families.id AND family_members.user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY families_insert_authenticated ON families FOR INSERT TO app_user WITH CHECK (created_by = auth.uid());
--> statement-breakpoint
CREATE POLICY families_update_owner ON families FOR UPDATE TO app_user USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
--> statement-breakpoint
CREATE POLICY families_delete_owner ON families FOR DELETE TO app_user USING (created_by = auth.uid());
--> statement-breakpoint

-- family_members
CREATE POLICY family_members_select ON family_members FOR SELECT TO app_user USING (public.is_family_member(family_id, auth.uid()));
--> statement-breakpoint
CREATE POLICY family_members_insert_self ON family_members FOR INSERT TO app_user WITH CHECK (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY family_members_delete ON family_members FOR DELETE TO app_user
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM families WHERE families.id = family_members.family_id AND families.created_by = auth.uid()));
--> statement-breakpoint

-- family_invites
CREATE POLICY family_invites_select ON family_invites FOR SELECT TO app_user
  USING (invited_by = auth.uid()
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM families WHERE families.id = family_invites.family_id AND families.created_by = auth.uid()));
--> statement-breakpoint
CREATE POLICY family_invites_insert_members ON family_invites FOR INSERT TO app_user
  WITH CHECK (invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = family_invites.family_id AND family_members.user_id = auth.uid()));
--> statement-breakpoint
CREATE POLICY family_invites_update_invitee ON family_invites FOR UPDATE TO app_user
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));
--> statement-breakpoint

-- gifts (Supabase 0005: personal wishlists, visible through any shared family)
CREATE POLICY gifts_select_shared_family ON gifts FOR SELECT TO app_user
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid() AND fm2.user_id = gifts.owner_id));
--> statement-breakpoint
CREATE POLICY gifts_insert_own ON gifts FOR INSERT TO app_user WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY gifts_update_own ON gifts FOR UPDATE TO app_user USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY gifts_delete_own ON gifts FOR DELETE TO app_user USING (owner_id = auth.uid());
--> statement-breakpoint

-- gift_claims: surprise preservation. An owner never sees a claim on their own gift.
CREATE POLICY gift_claims_select ON gift_claims FOR SELECT TO app_user
  USING (claimed_by = auth.uid() OR EXISTS (
    SELECT 1 FROM gifts g WHERE g.id = gift_claims.gift_id AND g.owner_id <> auth.uid() AND EXISTS (
      SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = g.owner_id)));
--> statement-breakpoint
CREATE POLICY gift_claims_insert ON gift_claims FOR INSERT TO app_user
  WITH CHECK (claimed_by = auth.uid() AND EXISTS (
    SELECT 1 FROM gifts g WHERE g.id = gift_claims.gift_id AND g.owner_id <> auth.uid() AND EXISTS (
      SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = g.owner_id)));
--> statement-breakpoint
CREATE POLICY gift_claims_update_claimer ON gift_claims FOR UPDATE TO app_user USING (claimed_by = auth.uid()) WITH CHECK (claimed_by = auth.uid());
--> statement-breakpoint
CREATE POLICY gift_claims_delete_claimer ON gift_claims FOR DELETE TO app_user USING (claimed_by = auth.uid());
--> statement-breakpoint

-- Owner membership when a family is created (Supabase 0001 trigger).
CREATE OR REPLACE FUNCTION public.handle_family_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO family_members (family_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (family_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER on_family_created AFTER INSERT ON families FOR EACH ROW EXECUTE FUNCTION public.handle_family_created();
--> statement-breakpoint

-- Definer functions: the only ways past RLS (spec P4).
CREATE OR REPLACE FUNCTION public.create_family(p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_family uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'Family name is required'; END IF;
  INSERT INTO families (name, created_by) VALUES (btrim(p_name), v_user) RETURNING id INTO v_family;
  RETURN v_family;
END $$;
--> statement-breakpoint
-- Replaces the old route's service-role delete-then-insert. Caller must be a member.
CREATE OR REPLACE FUNCTION public.create_invite(p_family_id uuid, p_email text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_token text;
BEGIN
  IF v_user IS NULL OR NOT is_family_member(p_family_id, v_user) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM family_invites WHERE family_id = p_family_id AND email = lower(btrim(p_email));
  INSERT INTO family_invites (family_id, invited_by, email) VALUES (p_family_id, v_user, lower(btrim(p_email)))
  RETURNING token INTO v_token;
  RETURN v_token;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_invite family_invites%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_invite FROM family_invites
   WHERE token = p_token AND accepted_at IS NULL AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO family_members (family_id, user_id, role) VALUES (v_invite.family_id, v_user, 'member')
  ON CONFLICT (family_id, user_id) DO NOTHING;
  UPDATE family_invites SET accepted_at = now() WHERE id = v_invite.id;
  RETURN v_invite.family_id;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.join_family(p_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_family uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO v_family FROM families WHERE lower(invite_code) = lower(btrim(p_code));
  IF v_family IS NULL THEN RETURN NULL; END IF;
  INSERT INTO family_members (family_id, user_id, role) VALUES (v_family, v_user, 'member')
  ON CONFLICT (family_id, user_id) DO NOTHING;
  RETURN v_family;
END $$;
--> statement-breakpoint
-- Landing pages, signed out or in: names only.
CREATE OR REPLACE FUNCTION public.invite_preview(p_token text)
RETURNS TABLE (family_id uuid, family_name text, inviter_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT i.family_id, f.name, p.name FROM family_invites i
  JOIN families f ON f.id = i.family_id JOIN profiles p ON p.id = i.invited_by
  WHERE i.token = p_token AND i.accepted_at IS NULL AND i.expires_at > now()
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.join_preview(p_code text)
RETURNS TABLE (family_id uuid, family_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT f.id, f.name FROM families f WHERE lower(f.invite_code) = lower(btrim(p_code))
$$;
--> statement-breakpoint
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['create_family(text)','create_invite(uuid, text)','accept_invite(text)','join_family(text)','invite_preview(text)','join_preview(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO app_user', f);
  END LOOP;
END $$;
