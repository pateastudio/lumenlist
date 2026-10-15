-- Fix RLS recursion on family_members by using a SECURITY DEFINER helper.

CREATE OR REPLACE FUNCTION public.is_family_member(_family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = _family_id
      AND fm.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_family_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "family_members_select" ON public.family_members;

CREATE POLICY "family_members_select"
  ON public.family_members
  FOR SELECT
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));
