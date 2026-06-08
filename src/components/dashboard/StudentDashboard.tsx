import { Link } from "@tanstack/react-router";
import { Flame, Calendar, KeyRound, Sparkles } from "lucide-react";

const STATS = [
  { label: "Para hoje", value: 12, icon: Sparkles },
  { label: "Sequência", value: "7 dias", icon: Flame },
  { label: "Aprendidas", value: 84, icon: Calendar },
];

const UPCOMING = [
  { day: "Hoje", count: 12 },
  { day: "Amanhã", count: 7 },
  { day: "Em 2 dias", count: 7 },
  { day: "Em 3 dias", count: 5 },
];

export function StudentDashboard() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Painel · Aluno
        </span>
        <h1 className="mt-2 font-display text-5xl">
          Olá, Lucas <span className="italic text-accent">·</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Turma FRA-101 · Cours Particulier
        </p>
      </header>

      {/* Hero CTA */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card p-10">
        <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Sua sessão de hoje
            </p>
            <p className="mt-2 font-display text-6xl">12 cartas</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tempo estimado · 4 minutos
            </p>
          </div>
          <Link
            to="/session"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-8 py-4 text-lg text-accent-foreground hover:opacity-90"
          >
            Iniciar revisão
          </Link>
        </div>
        <div className="paper-grain pointer-events-none absolute inset-0 opacity-50" />
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-3 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5">
            <s.icon className="h-4 w-4 text-accent" />
            <p className="mt-3 font-display text-3xl">{s.value}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Upcoming + Join */}
      <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-2xl">Próximos dias</h2>
          <ul className="mt-4 space-y-3">
            {UPCOMING.map((u) => (
              <li key={u.day} className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground">{u.day}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${(u.count / 12) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-sm">{u.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-dashed border-border bg-card p-6">
          <KeyRound className="h-4 w-4 text-accent" />
          <h2 className="mt-3 font-display text-2xl">Entrar em outra turma</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Digite o código fornecido pelo seu professor.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              placeholder="Ex. A88C436B"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2.5 font-mono uppercase outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="rounded-md bg-foreground px-4 text-background hover:opacity-90">
              Entrar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
