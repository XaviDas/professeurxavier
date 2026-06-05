import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2, Users, Layers } from "lucide-react";
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

type Flashcard = { id: string; word_fr: string; word_pt: string; created_at: string };
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
const COLORS = ["#e94560", "#16a34a", "#0ea5e9", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899"];

function ClasseDetailPage() {
  const { id: classId } = Route.useParams();
  const [className, setClassName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [cls, fc, mem, rv, pg] = await Promise.all([
      supabase.from("classes").select("name, invite_code").eq("id", classId).maybeSingle(),
      supabase
        .from("flashcards")
        .select("id, word_fr, word_pt, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false }),
      supabase
        .from("class_members")
        .select("student_id, profiles:student_id(id, full_name)")
        .eq("class_id", classId),
      supabase
        .from("card_reviews")
        .select("id, card_id, student_id, feedback, box_after, created_at")
        .in(
          "card_id",
          (
            await supabase.from("flashcards").select("id").eq("class_id", classId)
          ).data?.map((c) => c.id) ?? []
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("card_progress")
        .select("student_id, card_id, box_number")
        .in(
          "card_id",
          (
            await supabase.from("flashcards").select("id").eq("class_id", classId)
          ).data?.map((c) => c.id) ?? []
        ),
    ]);

    if (cls.data) {
      setClassName(cls.data.name);
      setInviteCode(cls.data.invite_code);
    }
    setCards(fc.data ?? []);
    const studs: Student[] = (mem.data ?? [])
      .map((m: any) => m.profiles)
      .filter(Boolean)
      .map((p: any) => ({ id: p.id, full_name: p.full_name || "Élève" }));
    setStudents(studs);
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

  // Chart: score % per student per day (cumulative running average per day)
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
    // Running average per student
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 text-foreground">
      <Link
        to="/dashboard/enseignant"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Retour
      </Link>
      <header className="mt-3 mb-10 flex items-end justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
            Classe
          </span>
          <h1 className="mt-2 font-display text-4xl">{className || "…"}</h1>
        </div>
        <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 font-mono text-sm">
          {inviteCode}
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground/70">Chargement…</p>
      ) : (
        <>
          <section className="mb-10 rounded-xl border border-border bg-card/40 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <h2 className="font-display text-2xl">Flashcards ({cards.length})</h2>
            </div>
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">Aucune carte pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4">Français</th>
                      <th className="py-2 pr-4">Portugais</th>
                      <th className="py-2 pr-4">Ajoutée le</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{c.word_fr}</td>
                        <td className="py-2 pr-4 italic text-accent">{c.word_pt}</td>
                        <td className="py-2 pr-4 text-muted-foreground/70">
                          {new Date(c.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => deleteCard(c.id)}
                            className="rounded-md p-1.5 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-10 rounded-xl border border-border bg-card/40 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="font-display text-2xl">Suivi des élèves ({students.length})</h2>
            </div>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">
                Aucun élève inscrit. Partagez le code <strong>{inviteCode}</strong>.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground/70">
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
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{s.full_name}</td>
                        <td className="py-2 pr-4">{s.cardsSeen}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              s.scoreAvg >= 66
                                ? "text-sage"
                                : s.scoreAvg >= 33
                                  ? "text-ochre"
                                  : "text-destructive"
                            }
                          >
                            {s.total ? `${s.scoreAvg}%` : "—"}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{s.boxAvg} / 5</td>
                        <td className="py-2 text-muted-foreground/70">{s.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-6">
            <h2 className="mb-4 font-display text-2xl">Évolution du score</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">
                Pas encore assez de révisions pour tracer la courbe.
              </p>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
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
