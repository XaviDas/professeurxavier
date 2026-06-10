
-- 1) Remove permissive INSERT policy on class_members; joining must go through join_class_by_code()
DROP POLICY IF EXISTS "Members: student joins via invite" ON public.class_members;

-- 2) Harden handle_new_user: never trust client-supplied role metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Always default to 'eleve'. Promotion to 'enseignant' must be done via a trusted admin path.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'eleve')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 3) Restrict EXECUTE on SECURITY DEFINER functions to authenticated users only (revoke anon/public)
REVOKE ALL ON FUNCTION public.join_class_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_class_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_class_teacher(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid) TO authenticated;

-- Trigger-only functions: nobody should call them directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.distribute_existing_to_new_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.distribute_new_flashcard() FROM PUBLIC, anon, authenticated;
