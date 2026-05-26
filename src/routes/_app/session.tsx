import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, Check } from "lucide-react";

export const Route = createFileRoute("/_app/session")({
  component: SessionPage,
});

const DECK = [
  { fr: "la boulangerie", pt: "a padaria" },
  { fr: "le quartier", pt: "o bairro" },
  { fr: "se promener", pt: "passear" },
  { fr: "tout à l'heure", pt: "daqui a pouco" },
  { fr: "néanmoins", pt: "no entanto" },
];

const FEEDBACK = [
  { label: "Je ne me rappelle pas", sub: "Rever hoje", tone: "border-destructive/40 hover:bg-destructive/5 text-destructive" },
  { label: "Difficile", sub: "~ 2 dias", tone: "border-ochre/50 hover:bg-ochre/10 text-foreground" },
  { label: "Moyen", sub: "~ 5 dias", tone: "border-border hover:bg-secondary text-foreground" },
  { label: "Facile", sub: "~ 12 dias", tone: "border-sage/50 hover:bg-sage/10 text-foreground" },
];

function SessionPage() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const card = DECK[index];
  const progress = ((index + (revealed ? 0.5 : 0)) / DECK.length) * 100;

  const handleFeedback = () => {
    if (index + 1 >= DECK.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setRevealed(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
            <Check className="h-8 w-8 text-sage" />
          </div>
          <h1 className="mt-6 font-display text-4xl">Sessão concluída</h1>
          <p className="mt-3 text-muted-foreground">
            Você revisou {DECK.length} cartas. Volte amanhã para continuar.
          </p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex rounded-md bg-foreground px-6 py-3 text-background hover:opacity-90"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col bg-background">
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Carta {index + 1} / {DECK.length}
          </span>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>
        <div className="h-0.5 w-full bg-secondary">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="rounded-lg border border-border bg-card px-10 py-20 text-center shadow-sm">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Francês
            </span>
            <p className="mt-4 font-display text-5xl leading-tight md:text-6xl">{card.fr}</p>

            {revealed && (
              <>
                <div className="mx-auto my-10 h-px w-16 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Português
                </span>
                <p className="mt-4 font-display text-4xl italic text-accent md:text-5xl">{card.pt}</p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full rounded-md bg-foreground py-4 text-background hover:opacity-90"
              >
                Mostrar resposta
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {FEEDBACK.map((f) => (
                  <button
                    key={f.label}
                    onClick={handleFeedback}
                    className={`flex flex-col items-center gap-1 rounded-md border bg-card py-4 px-3 transition-colors ${f.tone}`}
                  >
                    <span className="text-sm font-medium">{f.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
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
