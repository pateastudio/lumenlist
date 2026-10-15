-- Create a robust family creation RPC that avoids RLS timing/readback edge cases.

CREATE OR REPLACE FUNCTION public.create_family(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_family_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Family name is required';
  END IF;

  INSERT INTO public.families (name, created_by)
  VALUES (btrim(p_name), v_user_id)
  RETURNING id INTO v_family_id;

  -- Trigger also inserts owner membership; ON CONFLICT keeps this idempotent.
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (v_family_id, v_user_id, 'owner')
  ON CONFLICT (family_id, user_id) DO NOTHING;

  RETURN v_family_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_family(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_family(text) TO authenticated;
