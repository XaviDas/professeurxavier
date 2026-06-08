
CREATE OR REPLACE FUNCTION public.join_class_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _class_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO _class_id
  FROM public.classes
  WHERE upper(invite_code) = upper(_code)
  LIMIT 1;

  IF _class_id IS NULL THEN
    RAISE EXCEPTION 'Code invalide';
  END IF;

  INSERT INTO public.class_members (class_id, student_id)
  VALUES (_class_id, _user_id)
  ON CONFLICT DO NOTHING;

  RETURN _class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;
