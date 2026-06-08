import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/eleve/mot-de-passe")({
  head: () => ({ meta: [{ title: "Changer mon mot de passe" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (pw !== pw2) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { must_change_password: false },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/dashboard/eleve" });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col px-6 py-16 text-foreground">
      <Link
        to="/dashboard/eleve"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour
      </Link>

      <div className="mt-10">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          Sécurité
        </span>
        <h1 className="mt-3 font-display text-4xl">Changer mon mot de passe</h1>
        <p className="mt-2 text-sm text-muted-foreground/70">
          Choisis un nouveau mot de passe que toi seul connais.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">
            Nouveau mot de passe
          </span>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground/80">
            Confirmer le mot de passe
          </span>
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
