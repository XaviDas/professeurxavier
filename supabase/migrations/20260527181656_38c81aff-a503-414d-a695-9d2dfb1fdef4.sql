
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('enseignant', 'eleve');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES (separate for security) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ CLASSES ============
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8)),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- ============ CLASS MEMBERS ============
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_members TO authenticated;
GRANT ALL ON public.class_members TO service_role;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- ============ FLASHCARDS ============
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  word_fr TEXT NOT NULL,
  word_pt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- ============ CARD PROGRESS ============
CREATE TABLE public.card_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  box_number INTEGER NOT NULL DEFAULT 1 CHECK (box_number BETWEEN 1 AND 5),
  next_review_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_progress TO authenticated;
GRANT ALL ON public.card_progress TO service_role;
ALTER TABLE public.card_progress ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES: profiles ============
CREATE POLICY "Profiles: read own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Profiles: teacher reads students in own classes" ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'enseignant') AND EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = profiles.id AND c.teacher_id = auth.uid()
    )
  );
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ============ POLICIES: user_roles ============
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ POLICIES: classes ============
CREATE POLICY "Classes: teacher full access" ON public.classes FOR ALL TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Classes: student reads enrolled" ON public.classes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = classes.id AND cm.student_id = auth.uid()));

-- ============ POLICIES: class_members ============
CREATE POLICY "Members: student reads own" ON public.class_members FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Members: teacher reads own classes" ON public.class_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Members: student joins via invite" ON public.class_members FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Members: teacher removes from own classes" ON public.class_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid()));

-- ============ POLICIES: flashcards ============
CREATE POLICY "Cards: teacher full access" ON public.flashcards FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = flashcards.class_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = flashcards.class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Cards: student reads enrolled" ON public.flashcards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = flashcards.class_id AND cm.student_id = auth.uid()));

-- ============ POLICIES: card_progress (ÉLÈVE ne voit/modifie QUE ses lignes) ============
CREATE POLICY "Progress: student reads own" ON public.card_progress FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Progress: student inserts own" ON public.card_progress FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Progress: student updates own" ON public.card_progress FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Progress: student deletes own" ON public.card_progress FOR DELETE TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Progress: teacher reads class progress" ON public.card_progress FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flashcards f
    JOIN public.classes c ON c.id = f.class_id
    WHERE f.id = card_progress.card_id AND c.teacher_id = auth.uid()
  ));

-- ============ TRIGGER: auto-create profile + role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'eleve')::app_role;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
