import { createFileRoute, Link } from "@tanstack/react-router";
import logoXavier from "@/assets/logo-xavier.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Professeur Xavier — flashcards" },
      {
        name: "description",
        content: "Application de cartes mémoire du Professeur Xavier pour l'apprentissage du français.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-sm flex-col items-center">
          <div className="aspect-square w-64 sm:w-72">
            <img
              src={logoXavier}
              alt="Logo Professeur Xavier"
              className="h-full w-full object-contain"
            />
          </div>

          <p
            className="mt-6 text-2xl tracking-[0.2em] text-muted-foreground/70"
            style={{ fontWeight: 200 }}
          >
            flashcards
          </p>

          <Link
            to="/dashboard"
            className="mt-12 inline-flex w-full items-center justify-center rounded-md bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Connexion Élève
          </Link>
        </div>
      </main>

      <footer className="pb-8 text-center">
        <Link
          to="/dashboard"
          className="text-xs tracking-wide text-muted-foreground/60 underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"
        >
          Connexion Enseignant
        </Link>
      </footer>
    </div>
  );
}
