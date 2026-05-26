import { useState } from "react";
import { Copy, Plus, Sparkles, Users } from "lucide-react";

const CLASSES = [
  { name: "Cours Particulier Lucas", code: "FRA-101", students: 1, cards: 142 },
  { name: "Groupe Avancé", code: "FRA-204", students: 4, cards: 87 },
];

const RECENT = [
  { fr: "la boulangerie", pt: "a padaria", date: "Aujourd'hui" },
  { fr: "se promener", pt: "passear", date: "Aujourd'hui" },
  { fr: "néanmoins", pt: "no entanto", date: "Hier" },
];

export function TeacherDashboard() {
  const [fr, setFr] = useState("");
  const [pt, setPt] = useState("");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Tableau de bord · Enseignant
        </span>
        <h1 className="mt-2 font-display text-5xl">Bonjour, M. Laurent</h1>
        <p className="mt-2 text-muted-foreground">
          5 élèves actifs · 229 cartes en circulation
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Quick add */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-display text-2xl">Ajout rapide</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Le portugais sera traduit automatiquement si vous laissez vide.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Français (Recto)
              </label>
              <input
                value={fr}
                onChange={(e) => setFr(e.target.value)}
                placeholder="ex. la boulangerie"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 font-display text-xl outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Português (Verso) · auto
              </label>
              <input
                value={pt}
                onChange={(e) => setPt(e.target.value)}
                placeholder="(sera traduit automatiquement)"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 font-display text-xl italic text-accent outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Classe destinataire
              </label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring">
                {CLASSES.map((c) => (
                  <option key={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground py-3 text-background hover:opacity-90">
              <Plus className="h-4 w-4" />
              Ajouter au paquet
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Diffusion étalée — 7 mots maximum par jour pour vos élèves.
            </p>
          </div>
        </section>

        {/* Classes + recent */}
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <h2 className="font-display text-2xl">Mes classes</h2>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                + Nouvelle classe
              </button>
            </div>

            <ul className="divide-y divide-border">
              {CLASSES.map((c) => (
                <li key={c.code} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.students} élève{c.students > 1 ? "s" : ""} · {c.cards} cartes
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-secondary px-3 py-1.5 font-mono text-sm">
                    {c.code}
                    <button className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Dernières cartes ajoutées</h2>
            <ul className="mt-4 divide-y divide-border">
              {RECENT.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-lg">{r.fr}</span>
                    <span className="text-sm italic text-muted-foreground">{r.pt}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
