import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/eleve")({
  head: () => ({ meta: [{ title: "Mon espace — Élève" }] }),
  component: DashboardEleve,
});

function DashboardEleve() {
  const studentName = "Lucas";
  const cardsToday = 12;

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-md text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          Espace Élève
        </span>
        <h1 className="mt-3 font-display text-5xl">
          Bonjour, {studentName}
        </h1>

        <div className="mt-12 rounded-xl border border-border bg-card/40 p-10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Cartes à réviser aujourd'hui
          </p>
          <p className="mt-3 font-display text-7xl">{cardsToday}</p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Temps estimé · 4 minutes
          </p>
        </div>

        <Link
          to="/session"
          className="mt-10 inline-flex w-full items-center justify-center rounded-md bg-foreground px-8 py-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Lancer la révision
        </Link>
      </div>
    </div>
  );
}
