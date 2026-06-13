import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { recordReview, type ReviewRating, type ProgressRow } from "@/lib/fsrs";
import { fetchDueCards, DAILY_LIMIT, type SessionCard } from "@/lib/session";

export const Route = createFileRoute("/_app/session")({
  head: () => ({ meta: [{ title: "Session de révision" }] }),
  component: SessionPage,
});

// Carte de démonstration FSRS (état "new" par défaut)
const newProgress = (): ProgressRow => ({
  due: new Date().toISOString(),
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  reps: 0,
  lapses: 0,
  state: 0,
  last_review: null,
});

const DEMO_DECK: SessionCard[] = [
  { id: "demo-1", pt: "a padaria", fr: "la boulangerie", progress: newProgress() },
  { id: "demo-2", pt: "o bairro", fr: "le quartier", progress: newProgress() },
  { id: "demo-3", pt: "passear", fr: "se promener", progress: newProgress() },
  { id: "demo-4", pt: "daqui a pouco", fr: "tout à l'heure", progress: newProgress() },
  { id: "demo-5", pt: "no entanto", fr: "néanmoins", progress: newProgress() },
];

const FEEDBACK: { rating: ReviewRating; label: string; sub: string; tone: string }[] = [
  { rating: 1, label: "Je ne savais pas", sub: "Again", tone: "text-destructive border-destructive/40 hover:bg-destructive/10" },
  { rating: 2, label: "Difficile", sub: "Hard", tone: "border-ochre/50 hover:bg-ochre/10" },
  { rating: 3, label: "Je savais", sub: "Good", tone: "border-border hover:bg-secondary" },
  { rating: 4, label: "Très facile", sub: "Easy", tone: "border-sage/50 hover:bg-sage/10" },
];

function SessionPage() {
  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cards = await fetchDueCards();
      if (cancelled) return;
      const limited = (cards ?? DEMO_DECK).slice(0, DAILY_LIMIT);
      setDeck(limited);
      setLoading(false);
      if (limited.length === 0) setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const card = deck[index];
  const progress = deck.length
    ? ((index + (revealed ? 0.5 : 0)) / deck.length) * 100
    : 0;

  const handleFeedback = async (rating: ReviewRating) => {
    if (!card) return;
    await recordReview(card.id, card.progress, rating);
    if (index + 1 >= deck.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setRevealed(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-background text-muted-foreground/60">
        <span className="text-xs uppercase tracking-[0.25em]">Chargement…</span>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
            <Check className="h-8 w-8 text-sage" />
          </div>
          <h1 className="mt-6 font-display text-4xl">Excellent travail !</h1>
          <p className="mt-3 text-muted-foreground/70">
            Tu as fini ta session du jour. À demain !
          </p>

          <Link
            to="/dashboard/eleve"
            className="mt-8 inline-flex rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col bg-background text-foreground">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Carte {index + 1} / {deck.length}
          </span>
          <Link to="/dashboard/eleve" className="text-muted-foreground/70 hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>
        <div className="h-px w-full bg-border">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="perspective-1200">
            <div
              className={`preserve-3d relative h-72 w-full transition-transform duration-700 ease-out md:h-80 ${
                revealed ? "rotate-y-180" : ""
              }`}
            >
              <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card/60 px-10 py-16 text-center neon-border">
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                  Português
                </span>
                <p className="mt-6 font-display text-5xl leading-tight md:text-6xl">
                  {card.pt}
                </p>
              </div>

              <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card/60 px-10 py-16 text-center neon-border">
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                  Français
                </span>
                <p className="mt-6 font-display text-5xl italic leading-tight text-accent md:text-6xl">
                  {card.fr}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full rounded-md bg-foreground py-4 text-sm font-medium text-background hover:opacity-90"
              >
                Afficher la réponse
              </button>
            ) : (
              <div
                key={index}
                className="grid grid-cols-2 gap-3 animate-fade-up md:grid-cols-4"
              >
                {FEEDBACK.map((f) => (
                  <button
                    key={f.rating}
                    onClick={() => handleFeedback(f.rating)}
                    className={`flex flex-col items-center gap-1 rounded-md border bg-card/40 px-3 py-4 transition-colors ${f.tone}`}
                  >
                    <span className="text-sm font-medium">{f.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {f.sub}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
