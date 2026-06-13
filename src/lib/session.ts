// Récupère les cartes dues (FSRS) pour l'élève connecté, plafonnées à 25.
import { supabase } from "@/integrations/supabase/client";
import type { ProgressRow } from "@/lib/fsrs";

export const DAILY_LIMIT = 25;

export interface SessionCard {
  id: string;
  pt: string;
  fr: string;
  progress: ProgressRow;
}

export async function fetchDueCards(): Promise<SessionCard[] | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("card_progress")
    .select(
      "due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, card_id, flashcards:card_id(id, word_pt, word_fr)",
    )
    .eq("student_id", userId)
    .lte("due", now)
    .order("due", { ascending: true })
    .limit(DAILY_LIMIT);

  if (error) {
    console.error("[session] fetchDueCards failed", error);
    return null;
  }

  return (data ?? [])
    .map((row: any) => {
      const f = row.flashcards;
      if (!f) return null;
      return {
        id: f.id as string,
        pt: f.word_pt as string,
        fr: f.word_fr as string,
        progress: {
          due: row.due,
          stability: row.stability,
          difficulty: row.difficulty,
          elapsed_days: row.elapsed_days,
          scheduled_days: row.scheduled_days,
          reps: row.reps,
          lapses: row.lapses,
          state: row.state,
          last_review: row.last_review,
        } as ProgressRow,
      };
    })
    .filter((c): c is SessionCard => c !== null);
}
