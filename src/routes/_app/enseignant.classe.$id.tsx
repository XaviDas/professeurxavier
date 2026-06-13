import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2, Users, Layers, Copy, Download, BookOpen, Flame, Moon, X } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const RATING_META: Record<1 | 2 | 3 | 4, { dot: string; label: string; cls: string }> = {
  1: { dot: "🔴", label: "Again", cls: "text-[#e63946]" },
  2: { dot: "🟠", label: "Hard", cls: "text-[#f4a261]" },
  3: { dot: "🟢", label: "Good", cls: "text-[#2a9d8f]" },
  4: { dot: "🔵", label: "Easy", cls: "text-[#4361ee]" },
};

export const Route = createFileRoute("/_app/enseignant/classe/$id")({
  head: () => ({ meta: [{ title: "Détail de la classe" }] }),
  component: ClasseDetailPage,
});

type Flashcard = {
  id: string;
  word_fr: string;
  word_pt: string;
  created_at: string;
  owner_id: string | null;
};
type Student = { id: string; full_name: string };
type Review = {
  id: string;
  card_id: string;
  student_id: string;
  rating: 1 | 2 | 3 | 4;
  state_before: number;
  scheduled_days: number;
  created_at: string;
};
type Progress = { student_id: string; card_id: string; state: number; stability: number };

// Score 0..100 par note FSRS (1=Again, 2=Hard, 3=Good, 4=Easy)
const SCORE: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 33, 3: 66, 4: 100 };
const COLORS = ["#e63946", "#4361ee", "#2a9d8f", "#f4a261", "#a855f7", "#14b8a6", "#ec4899"];

function masteryColor(pct: number, hasData: boolean): { bar: string; label: string } {
  if (!hasData) return { bar: "#4a4a6a", label: "text-muted-foreground" };
  if (pct === 100) return { bar: "#2a9d8f", label: "text-[#2a9d8f]" };
  if (pct >= 71) return { bar: "#4361ee", label: "text-[#4361ee]" };
  if (pct >= 41) return { bar: "#f4a261", label: "text-[#f4a261]" };
  return { bar: "#e63946", label: "text-[#e63946]" };
}

function ClasseDetailPage() {
  const { id: classId } = Route.useParams();
  const [className, setClassName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [difficultDialog, setDifficultDialog] = useState<{
    student: string;
    items: { card: Flashcard; failed: number }[];
  } | null>(null);

  function copyDifficult() {
    if (!difficultDialog) return;
    const text = difficultDialog.items
      .map((it) => `${it.card.word_fr} — ${it.card.word_pt}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`${difficultDialog.items.length} mots copiés.`);
  }

  async function load() {
    setLoading(true);
    const cls = await supabase
      .from("classes")
      .select("name, invite_code")
      .eq("id", classId)
      .maybeSingle();

    const fc = await supabase
      .from("flashcards")
      .select("id, word_fr, word_pt, created_at, owner_id")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    const mem = await supabase
      .from("class_members")
      .select("student_id, profiles:student_id(id, full_name)")
      .eq("class_id", classId);

    const cardIds = (fc.data ?? []).map((c) => c.id);

    const [rv, pg] = await Promise.all([
      cardIds.length
        ? supabase
            .from("card_reviews")
            .select("id, card_id, student_id, rating, state_before, scheduled_days, created_at")
            .in("card_id", cardIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as Review[] }),
      cardIds.length
        ? supabase
            .from("card_progress")
            .select("student_id, card_id, state, stability")
            .in("card_id", cardIds)
        : Promise.resolve({ data: [] as Progress[] }),
    ]);

    if (cls.data) {
      setClassName(cls.data.name);
      setInviteCode(cls.data.invite_code);
    }
    setCards((fc.data ?? []) as Flashcard[]);
    const studs: Student[] = (mem.data ?? [])
      .map((m: any) => m.profiles)
      .filter(Boolean)
      .map((p: any) => ({ id: p.id, full_name: p.full_name || "Élève" }));
    setStudents(studs);
    setStudentNames(Object.fromEntries(studs.map((s) => [s.id, s.full_name])));
    setReviews((rv.data ?? []) as Review[]);
    setProgress((pg.data ?? []) as Progress[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function deleteCard(id: string) {
    if (!confirm("Supprimer cette carte ?")) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Carte supprimée.");
    load();
  }

  const classCards = useMemo(() => cards.filter((c) => !c.owner_id), [cards]);
  const personalCards = useMemo(() => cards.filter((c) => c.owner_id), [cards]);

  // Mastery per card (class cards only): avg of (easy+medium) ratio across reviews
  const cardMastery = useMemo(() => {
    const map = new Map<string, { pct: number; hasData: boolean }>();
    for (const c of classCards) {
      const rs = reviews.filter((r) => r.card_id === c.id);
      if (rs.length === 0) {
        map.set(c.id, { pct: 0, hasData: false });
        continue;
      }
      const good = rs.filter((r) => r.rating >= 3).length;
      map.set(c.id, { pct: Math.round((good / rs.length) * 100), hasData: true });
    }
    return map;
  }, [classCards, reviews]);

  const cardById = useMemo(() => {
    const m = new Map<string, Flashcard>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  const studentStats = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    return students.map((s) => {
      const own = reviews.filter((r) => r.student_id === s.id);
      const total = own.length;

      // Mastered: FSRS "Review" state (2) with stability suffisante
      const mastered = progress.filter(
        (p) => p.student_id === s.id && p.state === 2 && p.stability >= 21,
      ).length;
      const totalCards = progress.filter((p) => p.student_id === s.id).length;

      // Difficult words: per-card majority of forgot/hard
      const byCard = new Map<string, Review[]>();
      for (const r of own) {
        if (!byCard.has(r.card_id)) byCard.set(r.card_id, []);
        byCard.get(r.card_id)!.push(r);
      }
      const difficult: { card: Flashcard; failed: number }[] = [];
      byCard.forEach((rs, cardId) => {
        const bad = rs.filter((r) => r.rating <= 2).length;
        if (bad > rs.length / 2 && bad > 0) {
          const card = cardById.get(cardId);
          if (card) difficult.push({ card, failed: bad });
        }
      });
      difficult.sort((a, b) => b.failed - a.failed);

      // Last review + days since
      const lastTs = own.length
        ? Math.max(...own.map((r) => new Date(r.created_at).getTime()))
        : 0;
      const daysSince = lastTs ? Math.floor((now - lastTs) / DAY) : Infinity;
      let lastLabel = "Jamais";
      if (lastTs) {
        if (daysSince <= 0) lastLabel = "Aujourd'hui";
        else if (daysSince === 1) lastLabel = "Hier";
        else lastLabel = `Il y a ${daysSince} jours`;
      }

      let regularity: "regular" | "irregular" | "absent" = "absent";
      if (daysSince <= 2) regularity = "regular";
      else if (daysSince <= 5) regularity = "irregular";

      // Streak: consecutive days up to today (or yesterday) with at least 1 review
      const daysSet = new Set(own.map((r) => r.created_at.slice(0, 10)));
      let streak = 0;
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      // allow today missing if last review was yesterday
      if (!daysSet.has(cursor.toISOString().slice(0, 10))) {
        cursor.setTime(cursor.getTime() - DAY);
      }
      while (daysSet.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor.setTime(cursor.getTime() - DAY);
      }

      return { ...s, total, mastered, totalCards, difficult, lastLabel, regularity, streak };
    });
  }, [students, reviews, progress, cardById]);


  const chartData = useMemo(() => {
    if (!reviews.length) return [];
    const byDay = new Map<string, Record<string, { sum: number; n: number }>>();
    for (const r of reviews) {
      const day = r.created_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, {});
      const row = byDay.get(day)!;
      if (!row[r.student_id]) row[r.student_id] = { sum: 0, n: 0 };
      row[r.student_id].sum += SCORE[r.rating];
      row[r.student_id].n += 1;
    }
    const days = Array.from(byDay.keys()).sort();
    const running: Record<string, { sum: number; n: number }> = {};
    return days.map((day) => {
      const row = byDay.get(day)!;
      const out: Record<string, any> = { day };
      for (const s of students) {
        const cell = row[s.id];
        if (cell) {
          if (!running[s.id]) running[s.id] = { sum: 0, n: 0 };
          running[s.id].sum += cell.sum;
          running[s.id].n += cell.n;
        }
        if (running[s.id]) {
          out[s.full_name] = Math.round(running[s.id].sum / running[s.id].n);
        }
      }
      return out;
    });
  }, [reviews, students]);

  function copyList() {
    const text = classCards.map((c) => `${c.word_fr} — ${c.word_pt}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`${classCards.length} mots copiés.`);
  }

  function exportCSV() {
    const header = "Français,Portugais,Ajoutée le,Maîtrise (%)\n";
    const rows = classCards
      .map((c) => {
        const m = cardMastery.get(c.id);
        const pct = m?.hasData ? m.pct : "";
        const safe = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return `${safe(c.word_fr)},${safe(c.word_pt)},${c.created_at.slice(0, 10)},${pct}`;
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${className || "classe"}-vocabulaire.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 text-foreground">
      <Link
        to="/dashboard/enseignant"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Retour
      </Link>
      <header className="mt-3 mb-10 flex items-end justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Classe
          </span>
          <h1 className="mt-2 font-display text-4xl">{className || "…"}</h1>
        </div>
        <div className="rounded-md border border-dashed border-border bg-card px-3 py-2 font-mono text-sm">
          {inviteCode}
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="journal">Journal de révisions</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
          <section className="mb-10 rounded-xl border border-border bg-card/60 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#4361ee]" />
                <h2 className="font-display text-2xl">
                  Flashcards de la classe ({classCards.length})
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyList}
                  disabled={!classCards.length}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:border-[#4361ee] disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copier la liste
                </button>
                <button
                  onClick={exportCSV}
                  disabled={!classCards.length}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:border-[#4361ee] disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> Exporter (CSV)
                </button>
              </div>
            </div>
            {classCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune carte pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4">Français</th>
                      <th className="py-2 pr-4">Portugais</th>
                      <th className="py-2 pr-4 w-[35%]">Maîtrise moyenne</th>
                      <th className="py-2 pr-4">Ajoutée le</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {classCards.map((c) => {
                      const m = cardMastery.get(c.id) ?? { pct: 0, hasData: false };
                      const { bar, label } = masteryColor(m.pct, m.hasData);
                      return (
                        <tr key={c.id} className="border-b border-border/60">
                          <td className="py-2 pr-4">{c.word_fr}</td>
                          <td className="py-2 pr-4 italic text-[#e63946]">{c.word_pt}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${m.hasData ? Math.max(m.pct, 2) : 100}%`,
                                    background: bar,
                                    opacity: m.hasData ? 1 : 0.25,
                                  }}
                                />
                              </div>
                              <span className={`w-12 text-right font-mono text-xs ${label}`}>
                                {m.hasData ? `${m.pct}%` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => deleteCard(c.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-10 rounded-xl border border-border bg-card/60 p-6">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#4361ee]" />
              <h2 className="font-display text-2xl">
                Vocabulaire personnel des élèves ({personalCards.length})
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Mots ajoutés par les élèves depuis leurs lectures. Visibles uniquement par leur auteur lors des révisions.
            </p>
            {personalCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun mot personnel pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4">Élève</th>
                      <th className="py-2 pr-4">Français</th>
                      <th className="py-2 pr-4">Portugais</th>
                      <th className="py-2">Ajoutée le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalCards.map((c) => (
                      <tr key={c.id} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-medium">
                          {studentNames[c.owner_id ?? ""] ?? "—"}
                        </td>
                        <td className="py-2 pr-4">{c.word_fr}</td>
                        <td className="py-2 pr-4 italic text-[#e63946]">{c.word_pt}</td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-10 rounded-xl border border-border bg-card/60 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#4361ee]" />
              <h2 className="font-display text-2xl">Suivi des élèves ({students.length})</h2>
            </div>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun élève inscrit. Partagez le code <strong>{inviteCode}</strong>.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4">Élève</th>
                      <th className="py-2 pr-4">Régularité</th>
                      <th className="py-2 pr-4">Cartes maîtrisées</th>
                      <th className="py-2 pr-4">Mots difficiles</th>
                      <th className="py-2 pr-4">Streak</th>
                      <th className="py-2">Dernière révision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((s) => {
                      const reg =
                        s.regularity === "regular"
                          ? { dot: "🟢", label: "Régulier", cls: "text-[#2a9d8f]" }
                          : s.regularity === "irregular"
                            ? { dot: "🟡", label: "Irrégulier", cls: "text-[#f4a261]" }
                            : { dot: "🔴", label: "Absent", cls: "text-[#e63946]" };
                      return (
                        <tr key={s.id} className="border-b border-border/60">
                          <td className="py-2 pr-4 font-medium">{s.full_name}</td>
                          <td className="py-2 pr-4">
                            <span className={`inline-flex items-center gap-1.5 ${reg.cls}`}>
                              <span>{reg.dot}</span>
                              <span className="text-xs">{reg.label}</span>
                            </span>
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">
                            {s.mastered}/{s.totalCards}
                          </td>
                          <td className="py-2 pr-4">
                            {s.difficult.length > 0 ? (
                              <button
                                onClick={() =>
                                  setDifficultDialog({
                                    student: s.full_name,
                                    items: s.difficult,
                                  })
                                }
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:border-[#e63946] hover:text-[#e63946]"
                              >
                                {s.difficult.length} mot{s.difficult.length > 1 ? "s" : ""}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {s.streak > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[#f4a261]">
                                <Flame className="h-3.5 w-3.5" /> {s.streak}j
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Moon className="h-3.5 w-3.5" /> 0j
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground">{s.lastLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>


          <section className="rounded-xl border border-border bg-card/60 p-6">
            <h2 className="mb-4 font-display text-2xl">Évolution du score</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Pas encore assez de révisions pour tracer la courbe.
              </p>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
                    <XAxis dataKey="day" stroke="#a5a5c5" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#a5a5c5" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#232342",
                        border: "1px solid #2d2d4a",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#ffffff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {students.map((s, i) => (
                      <Line
                        key={s.id}
                        type="monotone"
                        dataKey={s.full_name}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          </TabsContent>

          <TabsContent value="journal">
            <JournalSection
              reviews={reviews}
              cardById={cardById}
              students={students}
            />
          </TabsContent>
        </Tabs>
      )}

      {difficultDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDifficultDialog(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Mots difficiles
                </span>
                <h3 className="mt-1 font-display text-xl">{difficultDialog.student}</h3>
              </div>
              <button
                onClick={() => setDifficultDialog(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 max-h-80 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 px-3">Français</th>
                    <th className="py-2 px-3">Portugais</th>
                    <th className="py-2 px-3 text-right">Raté</th>
                  </tr>
                </thead>
                <tbody>
                  {difficultDialog.items.map((it) => (
                    <tr key={it.card.id} className="border-b border-border/60">
                      <td className="py-2 px-3">{it.card.word_fr}</td>
                      <td className="py-2 px-3 italic text-[#e63946]">{it.card.word_pt}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs">{it.failed}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={copyDifficult}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs hover:border-[#4361ee]"
            >
              <Copy className="h-3.5 w-3.5" /> Copier la liste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

