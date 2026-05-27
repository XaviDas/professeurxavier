// Récupère les cartes dues pour l'élève connecté, plafonnées à 25.
import { supabase } from "@/integrations/supabase/client";

export const DAILY_LIMIT = 25;

export interface SessionCard {
  id: string;
  pt: string;
  fr: string;
  box: number;
}

export async function fetchDueCards(): Promise<SessionCard[] | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("card_progress")
    .select("box_number, next_review_date, card_id, flashcards:card_id(id, word_pt, word_fr)")
    .eq("student_id", userId)
    .lte("next_review_date", today.toISOString())
    .order("next_review_date", { ascending: true })
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
        box: row.box_number as number,
      };
    })
    .filter((c): c is SessionCard => c !== null);
}
