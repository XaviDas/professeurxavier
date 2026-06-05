
CREATE TABLE public.card_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback text NOT NULL CHECK (feedback IN ('forgot','hard','medium','easy')),
  box_before integer NOT NULL,
  box_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX card_reviews_student_idx ON public.card_reviews(student_id, created_at);
CREATE INDEX card_reviews_card_idx ON public.card_reviews(card_id);

GRANT SELECT, INSERT ON public.card_reviews TO authenticated;
GRANT ALL ON public.card_reviews TO service_role;

ALTER TABLE public.card_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews: student inserts own"
  ON public.card_reviews FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Reviews: student reads own"
  ON public.card_reviews FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Reviews: teacher reads class reviews"
  ON public.card_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flashcards f
    JOIN public.classes c ON c.id = f.class_id
    WHERE f.id = card_reviews.card_id AND c.teacher_id = auth.uid()
  ));
