import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard/enseignant")({
  head: () => ({ meta: [{ title: "Tableau de bord — Enseignant" }] }),
  component: DashboardEnseignant,
});

type ClassRow = {
  id: string;
  name: string;
  invite_code: string;
  students: number;
  cards: number;
};

const AUTO_DICT: Record<string, string> = {
  "la boulangerie": "a padaria",
  "le quartier": "o bairro",
  "se promener": "passear",
  "néanmoins": "no entanto",
  bonjour: "olá",
  merci: "obrigado",
};

function DashboardEnseignant() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");

  const [fr, setFr] = useState("");
  const [pt, setPt] = useState("");
  const [classe, setClasse] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const autoPt = pt || AUTO_DICT[fr.trim().toLowerCase()] || "";

  async function loadClasses() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, invite_code")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Impossible de charger les classes : " + error.message);
      setLoading(false);
      return;
    }

    // counts
    const rows: ClassRow[] = await Promise.all(
      (data ?? []).map(async (c) => {
        const [{ count: students }, { count: cards }] = await Promise.all([
          supabase.from("class_members").select("*", { count: "exact", head: true }).eq("class_id", c.id),
          supabase.from("flashcards").select("*", { count: "exact", head: true }).eq("class_id", c.id),
        ]);
        return { ...c, students: students ?? 0, cards: cards ?? 0 };
      })
    );
    setClasses(rows);
    if (rows.length && !classe) setClasse(rows[0].id);
    setLoading(false);
  }

  useEffect(() => {
    loadClasses();
  }, []);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Vous devez être connecté.");
      setCreating(false);
      return;
    }
    const { error } = await supabase
      .from("classes")
      .insert({ name: newName.trim(), teacher_id: user.id });
    setCreating(false);
    if (error) {
      toast.error("Création échouée : " + error.message);
      return;
    }
    toast.success("Classe créée !");
    setNewName("");
    setShowForm(false);
    loadClasses();
  }

  async function handleDeleteClass(id: string, name: string) {
    if (!confirm(`Supprimer définitivement la classe "${name}" ?`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast.error("Suppression échouée : " + error.message);
      return;
    }
    toast.success("Classe supprimée.");
    loadClasses();
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!fr.trim() || !classe) return;
    setAdding(true);
    const word_pt = (pt || autoPt).trim();
    if (!word_pt) {
      toast.error("Veuillez saisir la traduction portugaise.");
      setAdding(false);
      return;
    }
    const { error } = await supabase
      .from("flashcards")
      .insert({ class_id: classe, word_fr: fr.trim(), word_pt });
    setAdding(false);
    if (error) {
      toast.error("Ajout échoué : " + error.message);
      return;
    }
    toast.success("Carte ajoutée au paquet.");
    setFr("");
    setPt("");
    loadClasses();
  }

  const totalStudents = classes.reduce((a, c) => a + c.students, 0);
  const totalCards = classes.reduce((a, c) => a + c.cards, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 text-foreground">
      <header className="mb-12">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          Tableau de bord · Enseignant
        </span>
        <h1 className="mt-3 font-display text-5xl">Bonjour, Professeur Xavier</h1>
        <p className="mt-2 text-sm text-muted-foreground/70">
          {totalStudents} élève{totalStudents > 1 ? "s" : ""} actif{totalStudents > 1 ? "s" : ""} · {totalCards} cartes en circulation
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-xl border border-border bg-card/40 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-display text-2xl">Ajout rapide</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Saisissez le mot français et sa traduction portugaise.
          </p>

          <form onSubmit={handleAddCard} className="mt-6 space-y-4">
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
                Portugais (Recto pour l'élève)
              </label>
              <input
                value={pt}
                onChange={(e) => setPt(e.target.value)}
                placeholder={autoPt ? `suggestion : ${autoPt}` : "ex. a padaria"}
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
                disabled={!classes.length}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
              >
                {classes.length === 0 ? (
                  <option>— Créez d'abord une classe —</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                )}
              </select>
            </div>
            <button
              type="submit"
              disabled={adding || !classes.length}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {adding ? "Ajout en cours…" : "Ajouter au paquet"}
            </button>
            <p className="text-center text-xs text-muted-foreground/60">
              Diffusion étalée — 7 mots maximum par jour pour vos élèves.
            </p>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card/40 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="font-display text-2xl">Mes classes</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="text-xs text-muted-foreground/70 hover:text-foreground"
            >
              {showForm ? "Annuler" : "+ Nouvelle classe"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateClass} className="mb-4 flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom de la classe (ex. Cours Particulier Lucas)"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "…" : "Créer"}
              </button>
            </form>
          )}

          {loading ? (
            <p className="py-6 text-sm text-muted-foreground/70">Chargement…</p>
          ) : classes.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground/70">
              Aucune classe pour l'instant. Créez votre première classe ci-dessus.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {classes.map((c) => (
                <li key={c.id} className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to="/enseignant/classe/$id"
                      params={{ id: c.id }}
                      className="group flex-1"
                    >
                      <p className="font-medium group-hover:text-accent">{c.name}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {c.students} élève{c.students > 1 ? "s" : ""} · {c.cards} cartes
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteClass(c.id, c.name)}
                      className="rounded-md p-2 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
                      title="Supprimer la classe"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 rounded-md border border-dashed border-border bg-background/60 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      Inviter un élève
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-1.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground/60">Code de classe</p>
                        <p className="font-mono text-sm">{c.invite_code}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(c.invite_code);
                          toast.success("Code copié.");
                        }}
                        className="text-muted-foreground/70 hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground/60">
                      Communique le code de la classe à l'élève. Il devra définir son propre mot de passe lors de sa première connexion.
                    </p>
                  </div>
                </li>
              ))}

            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
