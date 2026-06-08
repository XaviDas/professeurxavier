import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard/eleve")({
  head: () => ({ meta: [{ title: "Mon espace — Élève" }] }),
  component: DashboardEleve,
});

interface DashState {
  loading: boolean;
  name: string;
  className: string | null;
  cardsToday: number;
}

function DashboardEleve() {
  const [state, setState] = useState<DashState>({
    loading: true,
    name: "",
    className: null,
    cardsToday: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        if (mounted) setState((s) => ({ ...s, loading: false }));
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
        .lte("next_review_date", todayEnd.toISOString());

      if (!mounted) return;
      setState({
        loading: false,
        name: (profile?.full_name || user.email || "élève").split(" ")[0],
        className: (membership?.classes as any)?.name ?? null,
        cardsToday: count ?? 0,
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-md text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          Espace Élève
        </span>
        <h1 className="mt-3 font-display text-5xl">
          {state.loading ? "…" : `Bonjour, ${state.name}`}
        </h1>
        {state.className && (
          <p className="mt-2 text-sm text-muted-foreground/70">{state.className}</p>
        )}

        <div className="mt-12 rounded-xl border border-border bg-card/40 p-10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Cartes à réviser aujourd'hui
          </p>
          <p className="mt-3 font-display text-7xl">
            {state.loading ? "—" : state.cardsToday}
          </p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            {state.cardsToday === 0
              ? "Rien à réviser pour aujourd'hui ✨"
              : `Temps estimé · ${Math.max(1, Math.round(state.cardsToday * 0.3))} minutes`}
          </p>
        </div>

        {state.cardsToday > 0 && (
          <Link
            to="/session"
            className="mt-10 inline-flex w-full items-center justify-center rounded-md bg-foreground px-8 py-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Lancer la révision
          </Link>
        )}
      </div>
    </div>
  );
}
