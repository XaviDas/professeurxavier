
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS flashcards_owner_id_idx ON public.flashcards(owner_id);

-- Allow enrolled students to insert their own personal cards
DROP POLICY IF EXISTS "Cards: student insert personal" ON public.flashcards;
CREATE POLICY "Cards: student insert personal"
  ON public.flashcards FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = flashcards.class_id AND cm.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Cards: student update personal" ON public.flashcards;
CREATE POLICY "Cards: student update personal"
  ON public.flashcards FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Cards: student delete personal" ON public.flashcards;
CREATE POLICY "Cards: student delete personal"
  ON public.flashcards FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Update distribution trigger: personal cards go only to their owner
CREATE OR REPLACE FUNCTION public.distribute_new_flashcard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _student RECORD;
  _pending_count INT;
  _offset_days INT;
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.card_progress (card_id, student_id, box_number, next_review_date)
    VALUES (NEW.id, NEW.owner_id, 1, CURRENT_DATE::timestamptz)
    ON CONFLICT (card_id, student_id) DO NOTHING;
    RETURN NEW;
  END IF;

  FOR _student IN
    SELECT student_id FROM public.class_members WHERE class_id = NEW.class_id
  LOOP
    SELECT COUNT(*) INTO _pending_count
    FROM public.card_progress cp
    JOIN public.flashcards f ON f.id = cp.card_id
    WHERE cp.student_id = _student.student_id
      AND f.class_id = NEW.class_id
      AND f.owner_id IS NULL
      AND cp.box_number = 1
      AND cp.next_review_date::date >= CURRENT_DATE;

    _offset_days := _pending_count / 7;

    INSERT INTO public.card_progress (card_id, student_id, box_number, next_review_date)
    VALUES (NEW.id, _student.student_id, 1, (CURRENT_DATE + _offset_days)::timestamptz)
    ON CONFLICT (card_id, student_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- New students only get class cards, not other students' personal cards
CREATE OR REPLACE FUNCTION public.distribute_existing_to_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _card RECORD;
  _idx INT := 0;
BEGIN
  FOR _card IN
    SELECT id FROM public.flashcards
    WHERE class_id = NEW.class_id AND owner_id IS NULL
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.card_progress (card_id, student_id, box_number, next_review_date)
    VALUES (_card.id, NEW.student_id, 1, (CURRENT_DATE + (_idx / 7))::timestamptz)
    ON CONFLICT (card_id, student_id) DO NOTHING;
    _idx := _idx + 1;
  END LOOP;
  RETURN NEW;
END;
$function$;
