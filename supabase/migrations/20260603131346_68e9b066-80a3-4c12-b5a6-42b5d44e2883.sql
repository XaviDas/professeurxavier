
-- Security definer helpers to break the classes <-> class_members recursion
CREATE OR REPLACE FUNCTION public.is_class_teacher(_class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND teacher_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_class_member(_class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members WHERE class_id = _class_id AND student_id = _user_id)
$$;

-- Drop recursive policies on classes
DROP POLICY IF EXISTS "Classes: student reads enrolled" ON public.classes;
DROP POLICY IF EXISTS "Classes: teacher full access" ON public.classes;

-- Recreate without cross-table recursion
CREATE POLICY "Classes: teacher full access"
  ON public.classes
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Classes: student reads enrolled"
  ON public.classes
  FOR SELECT
  TO authenticated
  USING (public.is_class_member(id, auth.uid()));

-- Drop recursive policies on class_members
DROP POLICY IF EXISTS "Members: teacher reads own classes" ON public.class_members;
DROP POLICY IF EXISTS "Members: teacher removes from own classes" ON public.class_members;
DROP POLICY IF EXISTS "Members: student reads own" ON public.class_members;
DROP POLICY IF EXISTS "Members: student joins via invite" ON public.class_members;

CREATE POLICY "Members: student reads own"
  ON public.class_members
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Members: teacher reads own classes"
  ON public.class_members
  FOR SELECT
  TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()));

CREATE POLICY "Members: student joins via invite"
  ON public.class_members
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Members: teacher removes from own classes"
  ON public.class_members
  FOR DELETE
  TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()));
