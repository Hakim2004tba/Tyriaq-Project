import { Target, Users, Award } from "lucide-react";

export const metadata = { title: "À propos — NB SPORT" };

export default function AProposPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black sm:text-4xl">
        L&apos;esprit <span className="text-accent-strong glow-text">NB SPORT</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
        NB SPORT est né d&apos;une passion pour le sport et la performance. Nous proposons des
        vêtements, chaussures, accessoires et équipements sportifs authentiques, sélectionnés pour
        accompagner chaque athlète, du débutant au compétiteur, dans tous ses mouvements.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="nb-card glow-border p-6">
          <Target className="h-7 w-7 text-accent-strong" />
          <p className="mt-3 text-sm font-bold">Notre mission</p>
          <p className="mt-1 text-xs text-muted">
            Rendre accessible une qualité sportive premium à chaque passionné en Algérie.
          </p>
        </div>
        <div className="nb-card glow-border p-6">
          <Award className="h-7 w-7 text-accent-strong" />
          <p className="mt-3 text-sm font-bold">Notre exigence</p>
          <p className="mt-1 text-xs text-muted">
            Des produits 100% authentiques, testés pour leur confort et leur durabilité.
          </p>
        </div>
        <div className="nb-card glow-border p-6">
          <Users className="h-7 w-7 text-accent-strong" />
          <p className="mt-3 text-sm font-bold">Notre communauté</p>
          <p className="mt-1 text-xs text-muted">
            Une équipe à l&apos;écoute pour accompagner chaque client à chaque étape.
          </p>
        </div>
      </div>
    </div>
  );
}
