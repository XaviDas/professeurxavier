
-- card_progress
ALTER TABLE public.card_progress DROP CONSTRAINT IF EXISTS card_progress_box_number_check;
ALTER TABLE public.card_progress
  DROP COLUMN IF EXISTS box_number,
  DROP COLUMN IF EXISTS next_review_date,
  ADD COLUMN due timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN stability float8 NOT NULL DEFAULT 0,
  ADD COLUMN difficulty float8 NOT NULL DEFAULT 0,
  ADD COLUMN elapsed_days int4 NOT NULL DEFAULT 0,
  ADD COLUMN scheduled_days int4 NOT NULL DEFAULT 0,
  ADD COLUMN reps int4 NOT NULL DEFAULT 0,
  ADD COLUMN lapses int4 NOT NULL DEFAULT 0,
  ADD COLUMN state int4 NOT NULL DEFAULT 0,
  ADD COLUMN last_review timestamptz;

CREATE INDEX IF NOT EXISTS card_progress_student_due_idx ON public.card_progress(student_id, due);

-- card_reviews
ALTER TABLE public.card_reviews DROP CONSTRAINT IF EXISTS card_reviews_feedback_check;
ALTER TABLE public.card_reviews
  DROP COLUMN IF EXISTS feedback,
  DROP COLUMN IF EXISTS box_before,
  DROP COLUMN IF EXISTS box_after,
  ADD COLUMN rating int4 NOT NULL DEFAULT 3,
  ADD COLUMN state_before int4 NOT NULL DEFAULT 0,
  ADD COLUMN scheduled_days int4 NOT NULL DEFAULT 0;
ALTER TABLE public.card_reviews ALTER COLUMN rating DROP DEFAULT;
ALTER TABLE public.card_reviews ALTER COLUMN state_before DROP DEFAULT;
ALTER TABLE public.card_reviews ALTER COLUMN scheduled_days DROP DEFAULT;
ALTER TABLE public.card_reviews ADD CONSTRAINT card_reviews_rating_check CHECK (rating BETWEEN 1 AND 4);

-- Update distribution functions to use `due` (FSRS new card defaults already correct)
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
    INSERT INTO public.card_progress (card_id, student_id, due)
    VALUES (_card.id, NEW.student_id, (CURRENT_DATE + (_idx / 7))::timestamptz)
    ON CONFLICT (card_id, student_id) DO NOTHING;
    _idx := _idx + 1;
  END LOOP;
  RETURN NEW;
END;
$function$;

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
    INSERT INTO public.card_progress (card_id, student_id, due)
    VALUES (NEW.id, NEW.owner_id, CURRENT_DATE::timestamptz)
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
      AND cp.state = 0
      AND cp.due::date >= CURRENT_DATE;

    _offset_days := _pending_count / 7;

    INSERT INTO public.card_progress (card_id, student_id, due)
    VALUES (NEW.id, _student.student_id, (CURRENT_DATE + _offset_days)::timestamptz)
    ON CONFLICT (card_id, student_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$function$;
