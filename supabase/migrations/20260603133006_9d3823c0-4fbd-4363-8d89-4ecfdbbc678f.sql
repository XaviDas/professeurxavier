DROP POLICY IF EXISTS "Cards: teacher full access" ON public.flashcards;

CREATE POLICY "Cards: teacher select"
ON public.flashcards FOR SELECT TO authenticated
USING (public.is_class_teacher(class_id, auth.uid()));

CREATE POLICY "Cards: teacher insert"
ON public.flashcards FOR INSERT TO authenticated
WITH CHECK (public.is_class_teacher(class_id, auth.uid()));

CREATE POLICY "Cards: teacher update"
ON public.flashcards FOR UPDATE TO authenticated
USING (public.is_class_teacher(class_id, auth.uid()))
WITH CHECK (public.is_class_teacher(class_id, auth.uid()));

CREATE POLICY "Cards: teacher delete"
ON public.flashcards FOR DELETE TO authenticated
USING (public.is_class_teacher(class_id, auth.uid()));