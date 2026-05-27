import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, Check } from "lucide-react";
import { recordFeedback, type Feedback } from "@/lib/leitner";

export const Route = createFileRoute("/_app/session")({
  head: () => ({ meta: [{ title: "Session de révision" }] }),
  component: SessionPage,
});

// Recto = Portugais (visible), Verso = Français (réponse)
// `id` correspond à flashcards.id ; `box` à card_progress.box_number.
const DECK = [
  { id: "demo-1", pt: "a padaria", fr: "la boulangerie", box: 1 },
  { id: "demo-2", pt: "o bairro", fr: "le quartier", box: 1 },
  { id: "demo-3", pt: "passear", fr: "se promener", box: 1 },
  { id: "demo-4", pt: "daqui a pouco", fr: "tout à l'heure", box: 1 },
  { id: "demo-5", pt: "no entanto", fr: "néanmoins", box: 1 },
];

const FEEDBACK: { key: Feedback; label: string; sub: string; tone: string }[] = [
  { key: "forgot", label: "Je ne me rappelle pas", sub: "Aujourd'hui", tone: "text-destructive border-destructive/40 hover:bg-destructive/10" },
  { key: "hard", label: "Difficile", sub: "Demain", tone: "border-ochre/50 hover:bg-ochre/10" },
  { key: "medium", label: "Moyen", sub: "Quelques jours", tone: "border-border hover:bg-secondary" },
  { key: "easy", label: "Facile", sub: "Espacement long", tone: "border-sage/50 hover:bg-sage/10" },
];

function SessionPage() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const card = DECK[index];
  const progress = ((index + (revealed ? 0.5 : 0)) / DECK.length) * 100;

  const handleFeedback = async (key: Feedback) => {
    await recordFeedback(card.id, card.box, key);
    if (index + 1 >= DECK.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setRevealed(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
            <Check className="h-8 w-8 text-sage" />
          </div>
          <h1 className="mt-6 font-display text-4xl">Session terminée</h1>
          <p className="mt-3 text-muted-foreground/70">
            Vous avez révisé {DECK.length} cartes. Revenez demain pour continuer.
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
      {/* Top bar with discreet progress */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Carte {index + 1} / {DECK.length}
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

      {/* Card */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="perspective-1200">
            <div
              className={`preserve-3d relative h-72 w-full transition-transform duration-700 ease-out md:h-80 ${
                revealed ? "rotate-y-180" : ""
              }`}
            >
              {/* Recto - Portugais */}
              <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card/60 px-10 py-16 text-center neon-border">
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                  Português
                </span>
                <p className="mt-6 font-display text-5xl leading-tight md:text-6xl">
                  {card.pt}
                </p>
              </div>

              {/* Verso - Français */}
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

          {/* Actions */}
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
                    key={f.label}
                    onClick={() => handleFeedback(f.key)}
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
