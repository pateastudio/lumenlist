-- ============================================================
-- Tables (all created first to avoid forward-reference errors in policies)
-- ============================================================

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  name       text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE families (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invite_code text UNIQUE NOT NULL DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE family_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);

CREATE TABLE family_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  accepted_at timestamptz,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, email)
);

CREATE TABLE gifts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  price       numeric(10, 2),
  url         text,
  image_url   text,
  sort_order  integer NOT NULL DEFAULT 0,
  source      text,
  external_id text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gift_claims (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id    uuid UNIQUE NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  claimed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'purchased')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX family_members_user_id_idx   ON family_members (user_id);
CREATE INDEX family_members_family_id_idx ON family_members (family_id);
CREATE INDEX gifts_owner_family_idx       ON gifts (owner_id, family_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE families      ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_claims    ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- families
CREATE POLICY "families_select_members"
  ON families FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "families_insert_authenticated"
  ON families FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "families_update_owner"
  ON families FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "families_delete_owner"
  ON families FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- family_members
CREATE POLICY "family_members_select"
  ON family_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm2
      WHERE fm2.family_id = family_members.family_id
        AND fm2.user_id = auth.uid()
    )
  );

CREATE POLICY "family_members_insert_self"
  ON family_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "family_members_delete"
  ON family_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
        AND families.created_by = auth.uid()
    )
  );

-- family_invites
CREATE POLICY "family_invites_select"
  ON family_invites FOR SELECT TO authenticated
  USING (
    invited_by = auth.uid()
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_invites.family_id
        AND families.created_by = auth.uid()
    )
  );

CREATE POLICY "family_invites_insert_members"
  ON family_invites FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invites.family_id
        AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "family_invites_update_invitee"
  ON family_invites FOR UPDATE TO authenticated
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- gifts
CREATE POLICY "gifts_select_family_members"
  ON gifts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = gifts.family_id
        AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "gifts_insert_own"
  ON gifts FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "gifts_update_own"
  ON gifts FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "gifts_delete_own"
  ON gifts FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- gift_claims: the surprise-preservation policy
CREATE POLICY "gift_claims_select"
  ON gift_claims FOR SELECT TO authenticated
  USING (
    claimed_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM gifts g
      JOIN family_members fm ON fm.family_id = g.family_id
      WHERE g.id = gift_claims.gift_id
        AND fm.user_id = auth.uid()
        AND g.owner_id <> auth.uid()
    )
  );

CREATE POLICY "gift_claims_insert"
  ON gift_claims FOR INSERT TO authenticated
  WITH CHECK (
    claimed_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM gifts g
      JOIN family_members fm ON fm.family_id = g.family_id
      WHERE g.id = gift_claims.gift_id
        AND fm.user_id = auth.uid()
        AND g.owner_id <> auth.uid()
    )
  );

CREATE POLICY "gift_claims_update_claimer"
  ON gift_claims FOR UPDATE TO authenticated
  USING (claimed_by = auth.uid()) WITH CHECK (claimed_by = auth.uid());

CREATE POLICY "gift_claims_delete_claimer"
  ON gift_claims FOR DELETE TO authenticated
  USING (claimed_by = auth.uid());

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Trigger: auto-add creator as owner when family is created
-- ============================================================
CREATE OR REPLACE FUNCTION handle_family_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_family_created
  AFTER INSERT ON families
  FOR EACH ROW EXECUTE FUNCTION handle_family_created();
