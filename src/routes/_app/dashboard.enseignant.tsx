import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Plus, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/enseignant")({
  head: () => ({ meta: [{ title: "Tableau de bord — Enseignant" }] }),
  component: DashboardEnseignant,
});

const CLASSES = [
  { name: "Cours Particulier Lucas", code: "FRA-101", students: 1, cards: 142 },
  { name: "Groupe Avancé", code: "FRA-204", students: 4, cards: 87 },
];

// Tiny mock dictionary for instant auto-translation preview
const AUTO_DICT: Record<string, string> = {
  "la boulangerie": "a padaria",
  "le quartier": "o bairro",
  "se promener": "passear",
  "néanmoins": "no entanto",
  "bonjour": "olá",
  "merci": "obrigado",
};

function DashboardEnseignant() {
  const [fr, setFr] = useState("");
  const [pt, setPt] = useState("");
  const [classe, setClasse] = useState(CLASSES[0].code);

  const autoPt = pt || AUTO_DICT[fr.trim().toLowerCase()] || "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 text-foreground">
      <header className="mb-12">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          Tableau de bord · Enseignant
        </span>
        <h1 className="mt-3 font-display text-5xl">Bonjour, Professeur Xavier</h1>
        <p className="mt-2 text-sm text-muted-foreground/70">
          {CLASSES.reduce((a, c) => a + c.students, 0)} élèves actifs ·{" "}
          {CLASSES.reduce((a, c) => a + c.cards, 0)} cartes en circulation
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Quick add */}
        <section className="rounded-xl border border-border bg-card/40 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-display text-2xl">Ajout rapide</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Saisissez le mot en français. La traduction portugaise est automatique
            si vous laissez le champ vide.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                Français (Recto pour vous · Verso pour l'élève)
              </label>
              <input
                value={fr}
                onChange={(e) => setFr(e.target.value)}
                placeholder="ex. la boulangerie"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 font-display text-xl outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                Portugais (Recto pour l'élève) · auto si vide
              </label>
              <input
                value={pt}
                onChange={(e) => setPt(e.target.value)}
                placeholder={autoPt ? `auto : ${autoPt}` : "(sera traduit automatiquement)"}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 font-display text-xl italic text-accent outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                Classe destinataire
              </label>
              <select
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                {CLASSES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground py-3 text-sm font-medium text-background hover:opacity-90">
              <Plus className="h-4 w-4" />
              Ajouter au paquet
            </button>
            <p className="text-center text-xs text-muted-foreground/60">
              Diffusion étalée — 7 mots maximum par jour pour vos élèves.
            </p>
          </div>
        </section>

        {/* Classes */}
        <section className="rounded-xl border border-border bg-card/40 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="font-display text-2xl">Mes classes</h2>
            </div>
            <button className="text-xs text-muted-foreground/70 hover:text-foreground">
              + Nouvelle classe
            </button>
          </div>

          <ul className="divide-y divide-border">
            {CLASSES.map((c) => (
              <li key={c.code} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground/70">
                    {c.students} élève{c.students > 1 ? "s" : ""} · {c.cards} cartes
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-1.5 font-mono text-sm">
                  {c.code}
                  <button className="text-muted-foreground/70 hover:text-foreground">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
