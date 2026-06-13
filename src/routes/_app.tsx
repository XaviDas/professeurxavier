import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    // Skip auth check on server — localStorage is not available during SSR.
    // The client-side AppLayout effect performs the real check after hydration.
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: location.pathname.startsWith("/dashboard/enseignant")
          ? "/login/enseignant"
          : "/login/eleve",
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!active) return;
      if (!sessionData.session) {
        const path = window.location.pathname;
        navigate({
          to: path.startsWith("/dashboard/enseignant")
            ? "/login/enseignant"
            : "/login/eleve",
        });
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      const mustChange = userData.user?.user_metadata?.must_change_password === true;
      const path = window.location.pathname;
      if (mustChange && path !== "/eleve/mot-de-passe") {
        navigate({ to: "/eleve/mot-de-passe" });
      }
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login/eleve" });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="h-4 w-px bg-border" />
            <span className="font-display text-sm text-muted-foreground">Pr. Xavier · flashcards</span>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
