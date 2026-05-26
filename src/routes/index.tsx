import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Layers, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassDeck — Flashcards FLE pour élèves brésiliens" },
      {
        name: "description",
        content:
          "Application de cartes mémoire à répétition espacée pour l'enseignement du Français Langue Étrangère aux élèves brésiliens.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background paper-grain">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground font-display text-lg">
            C
          </div>
          <span className="font-display text-xl">ClassDeck</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            Se connecter
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-md bg-foreground px-4 py-2 text-background hover:opacity-90"
          >
            Commencer
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-24 text-center">
        <span className="inline-block rounded-full border border-border px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          Français Langue Étrangère · Brasil
        </span>
        <h1 className="mt-6 font-display text-6xl leading-[1.05] tracking-tight md:text-7xl">
          La mémoire,<br />
          <span className="italic text-accent">à petites doses.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Un outil de cartes mémoire pensé pour les cours particuliers et petits groupes.
          L'enseignant écrit, les élèves révisent — chacun à son rythme.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-accent-foreground hover:opacity-90"
          >
            Créer un compte enseignant
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 hover:bg-secondary"
          >
            J'ai un code de classe
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl border-t border-border px-6 py-20">
        <div className="grid gap-12 md:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Vocabulaire partagé",
              desc: "L'enseignant ajoute le vocabulaire d'un cours, tous les élèves d'une classe le reçoivent.",
            },
            {
              icon: Sparkles,
              title: "Traduction automatique",
              desc: "Tapez en français, le portugais s'écrit tout seul. Vous gardez la main.",
            },
            {
              icon: Layers,
              title: "Sans décourager",
              desc: "Les longues listes sont étalées sur plusieurs jours. 7 mots maximum à découvrir par jour.",
            },
          ].map((f) => (
            <div key={f.title} className="space-y-3">
              <f.icon className="h-5 w-5 text-accent" />
              <h3 className="font-display text-xl">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© ClassDeck — Méthode FLE</span>
          <span className="font-display italic">à petites doses</span>
        </div>
      </footer>
    </div>
  );
}
