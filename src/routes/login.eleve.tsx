import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login/eleve")({
  head: () => ({ meta: [{ title: "Connexion Élève — Professeur Xavier" }] }),
  component: LoginEleve,
});

function LoginEleve() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (tab === "signup") {
        const code = inviteCode.trim().toUpperCase();
        if (!code) {
          toast.error("Code d'invitation requis");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard/eleve`,
            data: { full_name: fullName, role: "eleve" },
          },
        });
        if (error || !data.user) {
          toast.error(error?.message ?? "Inscription impossible");
          return;
        }
        const { error: joinErr } = await supabase.rpc("join_class_by_code", {
          _code: code,
        });
        if (joinErr) {
          toast.error(`Inscription créée, mais code invalide : ${joinErr.message}`);
          return;
        }
        toast.success("Compte créé !");
        navigate({ to: "/dashboard/eleve" });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error || !data.user) {
          toast.error(error?.message ?? "Identifiants invalides");
          return;
        }
        navigate({ to: "/dashboard/eleve" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-4xl">Espace Élève</h1>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Connecte-toi pour réviser tes cartes du jour.
            </p>
          </div>

          <div className="mb-6 flex rounded-md border border-border bg-card/50 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={`flex-1 rounded px-3 py-2 transition-colors ${
                tab === "signin" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={`flex-1 rounded px-3 py-2 transition-colors ${
                tab === "signup" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <Field
                label="Nom complet"
                type="text"
                placeholder="Ex. Lucas Silva"
                value={fullName}
                onChange={setFullName}
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              required
            />
            {tab === "signup" && (
              <Field
                label="Code d'invitation de la classe"
                type="text"
                placeholder="Ex. A88C436B"
                value={inviteCode}
                onChange={setInviteCode}
                required
                mono
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "…" : tab === "signin" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-muted-foreground/50">
        Professeur Xavier · flashcards
      </footer>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  required,
  mono,
}: {
  label: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">
        {label}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-border bg-card/40 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent ${
          mono ? "font-mono uppercase tracking-wider" : ""
        }`}
      />
    </label>
  );
}
