import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validatePassword, passwordHelpText } from "@/lib/password-validation";

type Search = { confirmed?: string };

export const Route = createFileRoute("/login/eleve")({
  head: () => ({ meta: [{ title: "Connexion Élève — Professeur Xavier" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    confirmed: typeof s.confirmed === "string" ? s.confirmed : undefined,
  }),
  component: LoginEleve,
});

function LoginEleve() {
  const search = useSearch({ from: "/login/eleve" }) as Search;
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (search.confirmed === "1") {
      toast.success("Compte confirmé, vous pouvez vous connecter.");
    }
  }, [search.confirmed]);

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
        const pwdError = validatePassword(password);
        if (pwdError) {
          toast.error(pwdError);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login/eleve?confirmed=1`,
            data: {
              full_name: fullName,
              invite_code: code,
            },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (data.session) {
          // Email confirmation disabled — join class immediately.
          const { error: joinErr } = await supabase.rpc("join_class_by_code", { _code: code });
          if (joinErr) {
            toast.error(`Compte créé, mais code invalide : ${joinErr.message}`);
            return;
          }
          toast.success("Compte créé !");
          navigate({ to: "/dashboard/eleve" });
        } else {
          setPendingEmail(email);
          toast.success("Email de confirmation envoyé.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          toast.error(error?.message ?? "Identifiants invalides");
          return;
        }
        // Best-effort: ensure the user joined their class (in case sign-up was via email confirmation).
        const code = (data.user.user_metadata?.invite_code as string | undefined)?.trim().toUpperCase();
        if (code) {
          const { error: joinErr } = await supabase.rpc("join_class_by_code", { _code: code });
          if (joinErr) {
            console.error("join_class_by_code failed:", joinErr.message);
            toast.error("Impossible de rejoindre la classe. Vérifiez le code de classe.");
          }
        }
        navigate({ to: "/dashboard/eleve" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (pendingEmail) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="px-6 pt-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <MailCheck className="mx-auto mb-4 h-10 w-10 text-accent" />
            <h1 className="font-display text-2xl">Vérifie ta boîte mail</h1>
            <p className="mt-3 text-sm text-muted-foreground/80">
              Un email de confirmation a été envoyé à{" "}
              <span className="font-mono text-foreground">{pendingEmail}</span>.
              <br />
              Clique sur le lien pour activer ton compte avant de te connecter.
            </p>
            <p className="mt-3 text-xs text-muted-foreground/60">
              Pense à vérifier le dossier spam si tu ne le trouves pas.
            </p>
            <button
              type="button"
              onClick={() => {
                setPendingEmail(null);
                setTab("signin");
              }}
              className="mt-6 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background hover:opacity-90"
            >
              Aller à la connexion
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="px-6 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-foreground">
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
            <PasswordField
              label="Mot de passe"
              value={password}
              onChange={setPassword}
              show={showPwd}
              onToggle={() => setShowPwd((v) => !v)}
              placeholder={tab === "signup" ? "8 caractères minimum" : "••••••••"}
            />
            {tab === "signup" && (
              <p className="text-xs text-muted-foreground/70">{passwordHelpText}</p>
            )}
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
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">{label}</span>
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

export function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          className="w-full rounded-md border border-border bg-card/40 px-3 py-2.5 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground/70 hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
