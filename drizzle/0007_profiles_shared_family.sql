-- contract: narrows profiles_select (#160). A signed-in user could read every profile; now they
-- read their own and those of people who share at least one family with them. Safe for the
-- previous release: every query it runs on profiles as app_user reads either the caller's own row
-- (layout, dashboard, account, invite route, the family_invites_select policy) or the profiles of
-- members of a family the caller belongs to (listFamilyMembers, fellowMembers, the members page
-- through the family hub). invite_preview reads the inviter's name as a definer, outside RLS, and
-- Better Auth's hooks write as auth_service, under their own policy. Neither is affected.
--
-- The check lives in a definer function so the policy never evaluates family_members' own policy
-- (no recursion, as with is_family_member). It takes only the other person's id and reads the
-- caller from auth.uid(), so it can't be used to ask about two other people.
CREATE OR REPLACE FUNCTION public.shares_family_with(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members mine JOIN family_members theirs ON theirs.family_id = mine.family_id
    WHERE mine.user_id = auth.uid() AND theirs.user_id = _user_id)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.shares_family_with(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.shares_family_with(uuid) TO app_user;
--> statement-breakpoint
-- ALTER, not DROP and CREATE: the policy is never missing, even for a moment.
ALTER POLICY profiles_select ON profiles USING (id = auth.uid() OR public.shares_family_with(id));
