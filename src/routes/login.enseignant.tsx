import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login/enseignant")({
  head: () => ({ meta: [{ title: "Connexion Enseignant — Professeur Xavier" }] }),
  component: LoginEnseignant,
});

function LoginEnseignant() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/dashboard/enseignant" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-4xl">Espace Enseignant</h1>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Connexion réservée au Professeur Xavier.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">
                Email
              </span>
              <input
                type="email"
                placeholder="prof@exemple.com"
                className="w-full rounded-md border border-border bg-card/40 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">
                Mot de passe
              </span>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-md border border-border bg-card/40 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Se connecter
            </button>
          </form>
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-muted-foreground/50">
        Professeur Xavier · flashcards
      </footer>
    </div>
  );
}
