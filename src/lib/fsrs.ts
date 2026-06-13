// Algorithme FSRS (Free Spaced Repetition Scheduler) via ts-fsrs.
// Remplace l'ancien système de boîtes Leitner.

import { fsrs, createEmptyCard, Rating, State, type Card as FsrsCard } from "ts-fsrs";
import { supabase } from "@/integrations/supabase/client";

export type ReviewRating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy
export { Rating, State };

const scheduler = fsrs();

export interface ProgressRow {
  due: string; // ISO timestamptz
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

function rowToCard(row: ProgressRow | null): FsrsCard {
  if (!row) return createEmptyCard();
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  } as FsrsCard;
}

function cardToRow(card: FsrsCard): ProgressRow {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

/**
 * Applique une note FSRS à la carte et persiste la nouvelle planification.
 */
export async function recordReview(
  cardId: string,
  current: ProgressRow | null,
  rating: ReviewRating,
): Promise<ProgressRow> {
  const card = rowToCard(current);
  const stateBefore = card.state as number;
  const now = new Date();
  const result = scheduler.next(card, now, rating as Rating);
  const nextRow = cardToRow(result.card);

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId);
  if (!isUuid) return nextRow;

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return nextRow;

  const { error } = await supabase.from("card_progress").upsert(
    {
      card_id: cardId,
      student_id: userId,
      ...nextRow,
    },
    { onConflict: "card_id,student_id" },
  );
  if (error) console.error("[fsrs] upsert failed", error);

  const { error: logErr } = await supabase.from("card_reviews").insert({
    card_id: cardId,
    student_id: userId,
    rating,
    state_before: stateBefore,
    scheduled_days: result.card.scheduled_days,
  });
  if (logErr) console.error("[fsrs] review log failed", logErr);

  return nextRow;
}
