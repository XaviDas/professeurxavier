import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login/eleve")({
  head: () => ({ meta: [{ title: "Connexion Élève — Professeur Xavier" }] }),
  component: LoginEleve,
});

function LoginEleve() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/dashboard/eleve" });
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
            <h1 className="font-display text-4xl">Espace Élève</h1>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Connecte-toi pour réviser tes cartes du jour.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-md border border-border bg-card/50 p-1 text-sm">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 rounded px-3 py-2 transition-colors ${
                tab === "signin" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Se connecter
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 rounded px-3 py-2 transition-colors ${
                tab === "signup" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <Field label="Nom complet" type="text" placeholder="Ex. Lucas Silva" />
            )}
            <Field label="Email" type="email" placeholder="vous@exemple.com" />
            <Field label="Mot de passe" type="password" placeholder="••••••••" />
            {tab === "signup" && (
              <Field
                label="Code d'invitation de la classe"
                type="text"
                placeholder="FRA-XXX"
                mono
              />
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {tab === "signin" ? "Se connecter" : "Créer mon compte"}
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

function Field({
  label,
  type,
  placeholder,
  mono,
}: {
  label: string;
  type: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-md border border-border bg-card/40 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent ${
          mono ? "font-mono uppercase tracking-wider" : ""
        }`}
      />
    </label>
  );
}
