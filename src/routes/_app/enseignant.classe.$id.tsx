import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2, Users, Layers, Copy, Download, BookOpen } from "lucide-react";
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
import { toast } from "sonner";

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
  feedback: "forgot" | "hard" | "medium" | "easy";
  box_after: number;
  created_at: string;
};
type Progress = { student_id: string; card_id: string; box_number: number };

const SCORE: Record<Review["feedback"], number> = { forgot: 0, hard: 33, medium: 66, easy: 100 };
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
            .select("id, card_id, student_id, feedback, box_after, created_at")
            .in("card_id", cardIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as Review[] }),
      cardIds.length
        ? supabase
            .from("card_progress")
            .select("student_id, card_id, box_number")
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
      const good = rs.filter((r) => r.feedback === "easy" || r.feedback === "medium").length;
      map.set(c.id, { pct: Math.round((good / rs.length) * 100), hasData: true });
    }
    return map;
  }, [classCards, reviews]);

  const studentStats = useMemo(() => {
    return students.map((s) => {
      const own = reviews.filter((r) => r.student_id === s.id);
      const cardsSeen = new Set(own.map((r) => r.card_id)).size;
      const good = own.filter((r) => r.feedback === "easy" || r.feedback === "medium").length;
      const total = own.length;
      const scoreAvg = total ? Math.round((good / total) * 100) : 0;
      const boxes = progress.filter((p) => p.student_id === s.id).map((p) => p.box_number);
      const boxAvg = boxes.length
        ? (boxes.reduce((a, b) => a + b, 0) / boxes.length).toFixed(1)
        : "—";
      return { ...s, cardsSeen, scoreAvg, boxAvg, total };
    });
  }, [students, reviews, progress]);

  const chartData = useMemo(() => {
    if (!reviews.length) return [];
    const byDay = new Map<string, Record<string, { sum: number; n: number }>>();
    for (const r of reviews) {
      const day = r.created_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, {});
      const row = byDay.get(day)!;
      if (!row[r.student_id]) row[r.student_id] = { sum: 0, n: 0 };
      row[r.student_id].sum += SCORE[r.feedback];
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
        <>
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
                      <th className="py-2 pr-4">Nom</th>
                      <th className="py-2 pr-4">Cartes vues</th>
                      <th className="py-2 pr-4">Score moyen</th>
                      <th className="py-2 pr-4">Boîte moyenne</th>
                      <th className="py-2">Révisions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((s) => (
                      <tr key={s.id} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-medium">{s.full_name}</td>
                        <td className="py-2 pr-4">{s.cardsSeen}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              s.scoreAvg >= 66
                                ? "text-[#2a9d8f]"
                                : s.scoreAvg >= 33
                                  ? "text-[#f4a261]"
                                  : "text-[#e63946]"
                            }
                          >
                            {s.total ? `${s.scoreAvg}%` : "—"}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{s.boxAvg} / 5</td>
                        <td className="py-2 text-muted-foreground">{s.total}</td>
                      </tr>
                    ))}
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
        </>
      )}
    </div>
  );
}
