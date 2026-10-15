-- ============================================================
-- Make gifts personal (no longer scoped to a single family).
-- Visibility is determined by shared family membership between
-- the viewer and the gift owner, enforced at the RLS layer.
-- ============================================================

-- 1. Drop policies that depend on gifts.family_id before dropping the column
DROP POLICY "gifts_select_family_members" ON gifts;
DROP POLICY "gift_claims_select" ON gift_claims;
DROP POLICY "gift_claims_insert" ON gift_claims;

-- 2. Remove family_id from gifts
DROP INDEX IF EXISTS gifts_owner_family_idx;
ALTER TABLE gifts DROP COLUMN family_id;
CREATE INDEX gifts_owner_idx ON gifts (owner_id);

-- 3. Gifts: new shared-family SELECT policy
CREATE POLICY "gifts_select_shared_family" ON gifts
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
        AND fm2.user_id = gifts.owner_id
    )
  );

-- 4. Gift claims: new SELECT policy (surprise-preservation preserved)
CREATE POLICY "gift_claims_select" ON gift_claims
  FOR SELECT TO authenticated
  USING (
    claimed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gifts g
      WHERE g.id = gift_claims.gift_id
        AND g.owner_id <> auth.uid()
        AND EXISTS (
          SELECT 1 FROM family_members fm1
          JOIN family_members fm2 ON fm1.family_id = fm2.family_id
          WHERE fm1.user_id = auth.uid()
            AND fm2.user_id = g.owner_id
        )
    )
  );

-- 5. Gift claims: new INSERT policy
CREATE POLICY "gift_claims_insert" ON gift_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    claimed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM gifts g
      WHERE g.id = gift_claims.gift_id
        AND g.owner_id <> auth.uid()
        AND EXISTS (
          SELECT 1 FROM family_members fm1
          JOIN family_members fm2 ON fm1.family_id = fm2.family_id
          WHERE fm1.user_id = auth.uid()
            AND fm2.user_id = g.owner_id
        )
    )
  );
