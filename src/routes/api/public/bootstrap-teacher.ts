import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-teacher")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "xavierdassi@gmail.com";
        const password = "0604xa";

        // Create or fetch user
        let userId: string | null = null;
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Professeur Xavier", role: "enseignant" },
        });

        if (createErr) {
          // Likely already exists — find by listing
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const existing = list?.users.find((u) => u.email === email);
          if (!existing) {
            return new Response(JSON.stringify({ error: createErr.message }), { status: 500 });
          }
          userId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            user_metadata: { full_name: "Professeur Xavier", role: "enseignant" },
          });
        } else {
          userId = created.user.id;
        }

        // Ensure profile
        await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId!, full_name: "Professeur Xavier" }, { onConflict: "id" });

        // Force enseignant role (delete any existing roles first)
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId!);
        await supabaseAdmin.from("user_roles").insert({ user_id: userId!, role: "enseignant" });

        return new Response(JSON.stringify({ ok: true, userId, email, password }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
