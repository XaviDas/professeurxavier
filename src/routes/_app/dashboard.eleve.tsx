import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, BookOpen, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard/eleve")({
  head: () => ({ meta: [{ title: "Mon espace — Élève" }] }),
  component: DashboardEleve,
});

interface DashState {
  loading: boolean;
  name: string;
  className: string | null;
  classId: string | null;
  userId: string | null;
  cardsToday: number;
  mustChangePassword: boolean;
}

type PersonalCard = {
  id: string;
  word_fr: string;
  word_pt: string;
  created_at: string;
};

function DashboardEleve() {
  const [state, setState] = useState<DashState>({
    loading: true,
    name: "",
    className: null,
    classId: null,
    userId: null,
    cardsToday: 0,
    mustChangePassword: false,
  });
  const [tab, setTab] = useState<"revision" | "vocab">("revision");
  const [personal, setPersonal] = useState<PersonalCard[]>([]);
  const [loadingVocab, setLoadingVocab] = useState(false);
  const [fr, setFr] = useState("");
  const [pt, setPt] = useState("");
  const [adding, setAdding] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function loadDashboard() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("class_members")
        .select("class_id, classes:class_id(name)")
        .eq("student_id", user.id)
        .maybeSingle(),
    ]);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const { count } = await supabase
      .from("card_progress")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .lte("due", todayEnd.toISOString());

    setState({
      loading: false,
      name: (profile?.full_name || user.email || "élève").split(" ")[0],
      className: (membership?.classes as any)?.name ?? null,
      classId: membership?.class_id ?? null,
      userId: user.id,
      cardsToday: count ?? 0,
      mustChangePassword: user.user_metadata?.must_change_password === true,
    });
  }

  async function loadPersonal() {
    if (!state.userId) return;
    setLoadingVocab(true);
    const { data } = await supabase
      .from("flashcards")
      .select("id, word_fr, word_pt, created_at")
      .eq("owner_id", state.userId)
      .order("created_at", { ascending: false });
    setPersonal((data ?? []) as PersonalCard[]);
    setLoadingVocab(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (tab === "vocab" && state.userId) loadPersonal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, state.userId]);

  async function joinClass(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code || joining) return;
    setJoining(true);
    setJoinError(null);
    const { error } = await supabase.rpc("join_class_by_code", { _code: code });
    setJoining(false);
    if (error) {
      console.error("join_class_by_code failed:", error.message);
      setJoinError("Code de classe invalide");
      toast.error("Code de classe invalide");
      return;
    }
    // Sauvegarder le code dans les métadonnées utilisateur pour les prochaines connexions
    const { error: updateErr } = await supabase.auth.updateUser({ data: { invite_code: code } });
    if (updateErr) {
      console.error("updateUser failed:", updateErr.message);
    }
    toast.success("Classe rejointe.");
    setJoinCode("");
    setTab("revision");
    await loadDashboard();
  }

  async function addPersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!fr.trim() || !pt.trim() || !state.classId || !state.userId) return;
    setAdding(true);
    const { error } = await supabase.from("flashcards").insert({
      class_id: state.classId,
      owner_id: state.userId,
      word_fr: fr.trim(),
      word_pt: pt.trim(),
    });
    setAdding(false);
    if (error) {
      toast.error("Ajout échoué : " + error.message);
      return;
    }
    toast.success("Mot ajouté à votre vocabulaire.");
    setFr("");
    setPt("");
    loadPersonal();
    loadDashboard();
  }

  async function deletePersonal(id: string) {
    if (!confirm("Supprimer ce mot ?")) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mot supprimé.");
    loadPersonal();
    loadDashboard();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-foreground">
      {state.mustChangePassword && !state.loading && (
        <div className="mb-8 rounded-md border border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground">
          C'est votre première connexion. Nous vous recommandons de{" "}
          <Link
            to="/eleve/mot-de-passe"
            className="text-foreground underline underline-offset-2 hover:text-[#4361ee]"
          >
            changer votre mot de passe
          </Link>
          .
        </div>
      )}

      <header className="text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Espace Élève
        </span>
        <h1 className="mt-3 font-display text-5xl">
          {state.loading ? "…" : `Bonjour, ${state.name}`}
        </h1>
        {state.className && (
          <p className="mt-2 text-sm text-muted-foreground">{state.className}</p>
        )}
      </header>

      {!state.loading && !state.classId && (
        <form onSubmit={joinClass} className="mx-auto mt-10 max-w-sm rounded-xl border border-border bg-card p-6 text-left">
          <h2 className="font-display text-2xl">Rejoindre une classe</h2>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">
              Code de classe
            </span>
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                setJoinError(null);
              }}
              placeholder="Ex. A88C436B"
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 font-mono text-sm uppercase tracking-wider outline-none focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
            />
          </label>
          {joinError && <p className="mt-2 text-sm text-destructive">{joinError}</p>}
          <button
            type="submit"
            disabled={joining || !joinCode.trim()}
            className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#4361ee] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {joining ? "Connexion…" : "Rejoindre"}
          </button>
        </form>
      )}

      {!state.loading && !state.classId ? null : (
        <>

      {/* Tabs */}
      <div className="mt-10 flex justify-center gap-1 rounded-md border border-border bg-card p-1">
        <button
          onClick={() => setTab("revision")}
          className={`flex-1 rounded px-4 py-2 text-sm transition ${
            tab === "revision"
              ? "bg-[#4361ee] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Révision
        </button>
        <button
          onClick={() => setTab("vocab")}
          className={`flex-1 rounded px-4 py-2 text-sm transition ${
            tab === "vocab"
              ? "bg-[#4361ee] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mon vocabulaire
        </button>
      </div>

      {tab === "revision" ? (
        <div className="mt-8 text-center">
          <div className="rounded-xl border border-border bg-card p-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Cartes à réviser aujourd'hui
            </p>
            <p className="mt-3 font-display text-7xl">
              {state.loading ? "—" : state.cardsToday}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.cardsToday === 0
                ? "Rien à réviser pour aujourd'hui ✨"
                : `Temps estimé · ${Math.max(1, Math.round(state.cardsToday * 0.3))} minutes`}
            </p>
          </div>

          {state.cardsToday > 0 && (
            <Link
              to="/session"
              className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-[#4361ee] px-8 py-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Lancer la révision
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {!state.classId ? (
            <p className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Vous devez rejoindre une classe avant d'ajouter du vocabulaire personnel.
            </p>
          ) : (
            <>
              <form
                onSubmit={addPersonal}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#4361ee]" />
                  <h2 className="font-display text-xl">Ajouter un mot</h2>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Vos mots sont privés. Ils s'ajoutent à votre programme de révision.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={fr}
                    onChange={(e) => setFr(e.target.value)}
                    placeholder="Mot français"
                    className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                  />
                  <input
                    value={pt}
                    onChange={(e) => setPt(e.target.value)}
                    placeholder="Traduction portugaise"
                    className="rounded-md border border-border bg-background px-3 py-2.5 text-sm italic outline-none focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={adding || !fr.trim() || !pt.trim()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#4361ee] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {adding ? "Ajout…" : "Ajouter à mon vocabulaire"}
                </button>
              </form>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#4361ee]" />
                  <h2 className="font-display text-xl">
                    Mes mots ({personal.length})
                  </h2>
                </div>
                {loadingVocab ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : personal.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun mot pour l'instant. Ajoutez votre premier !
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {personal.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-2.5">
                        <div className="text-sm">
                          <span>{c.word_fr}</span>
                          <span className="mx-2 text-muted-foreground">—</span>
                          <span className="italic text-[#e63946]">{c.word_pt}</span>
                        </div>
                        <button
                          onClick={() => deletePersonal(c.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
