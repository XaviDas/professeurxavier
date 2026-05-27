// Algorithme de répétition espacée (Leitner) — ClassDeck
// 5 boîtes. Chaque carte commence en Boîte 1.

import { supabase } from "@/integrations/supabase/client";

export type Feedback = "forgot" | "hard" | "medium" | "easy";

export interface ProgressState {
  box_number: number; // 1..5
  next_review_date: string; // ISO
}

const MEDIUM_DAYS: Record<number, number> = { 2: 2, 3: 5, 4: 7, 5: 21 };
const EASY_DAYS: Record<number, number> = { 2: 4, 3: 7, 4: 14, 5: 45 };

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

/**
 * Calcule le prochain état d'une carte selon le feedback de l'élève.
 * @param currentBox Boîte actuelle (1..5).
 * @param feedback   Bouton choisi.
 */
export function computeNextProgress(
  currentBox: number,
  feedback: Feedback,
): ProgressState {
  const safeBox = Math.min(Math.max(currentBox, 1), 5);

  switch (feedback) {
    case "forgot":
      // Retombe en Boîte 1 — à revoir aujourd'hui.
      return { box_number: 1, next_review_date: addDays(0) };

    case "hard":
      // Reste dans sa boîte — à revoir demain.
      return { box_number: safeBox, next_review_date: addDays(1) };

    case "medium": {
      const nextBox = Math.min(safeBox + 1, 5);
      return {
        box_number: nextBox,
        next_review_date: addDays(MEDIUM_DAYS[nextBox] ?? 21),
      };
    }

    case "easy": {
      const nextBox = Math.min(safeBox + 1, 5);
      return {
        box_number: nextBox,
        next_review_date: addDays(EASY_DAYS[nextBox] ?? 45),
      };
    }
  }
}

/**
 * Persiste la progression de l'élève pour une carte donnée (upsert).
 * Si aucun utilisateur n'est connecté ou si l'id de carte n'est pas un UUID,
 * la fonction se contente de calculer l'état sans appel réseau.
 */
export async function recordFeedback(
  cardId: string,
  currentBox: number,
  feedback: Feedback,
): Promise<ProgressState> {
  const next = computeNextProgress(currentBox, feedback);

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cardId,
    );
  if (!isUuid) return next;

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return next;

  const { error } = await supabase.from("card_progress").upsert(
    {
      card_id: cardId,
      student_id: userId,
      box_number: next.box_number,
      next_review_date: next.next_review_date,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "card_id,student_id" },
  );
  if (error) console.error("[leitner] upsert failed", error);

  return next;
}
