
-- Trigger 1: distribuer une nouvelle flashcard à tous les élèves inscrits
CREATE OR REPLACE FUNCTION public.distribute_new_flashcard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student RECORD;
  _pending_count INT;
  _offset_days INT;
BEGIN
  FOR _student IN
    SELECT student_id FROM public.class_members WHERE class_id = NEW.class_id
  LOOP
    SELECT COUNT(*) INTO _pending_count
    FROM public.card_progress cp
    JOIN public.flashcards f ON f.id = cp.card_id
    WHERE cp.student_id = _student.student_id
      AND f.class_id = NEW.class_id
      AND cp.box_number = 1
      AND cp.next_review_date::date >= CURRENT_DATE;

    _offset_days := _pending_count / 7;

    INSERT INTO public.card_progress (card_id, student_id, box_number, next_review_date)
    VALUES (NEW.id, _student.student_id, 1, (CURRENT_DATE + _offset_days)::timestamptz)
    ON CONFLICT (card_id, student_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_flashcard_insert_distribute ON public.flashcards;
CREATE TRIGGER on_flashcard_insert_distribute
AFTER INSERT ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.distribute_new_flashcard();

-- Trigger 2: distribuer les flashcards existantes à un nouvel élève
CREATE OR REPLACE FUNCTION public.distribute_existing_to_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _card RECORD;
  _idx INT := 0;
BEGIN
  FOR _card IN
    SELECT id FROM public.flashcards
    WHERE class_id = NEW.class_id
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.card_progress (card_id, student_id, box_number, next_review_date)
    VALUES (_card.id, NEW.student_id, 1, (CURRENT_DATE + (_idx / 7))::timestamptz)
    ON CONFLICT (card_id, student_id) DO NOTHING;
    _idx := _idx + 1;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_class_member_join_distribute ON public.class_members;
CREATE TRIGGER on_class_member_join_distribute
AFTER INSERT ON public.class_members
FOR EACH ROW EXECUTE FUNCTION public.distribute_existing_to_new_member();

-- Unicité (card_id, student_id) requise pour ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS card_progress_card_student_unique
ON public.card_progress (card_id, student_id);
