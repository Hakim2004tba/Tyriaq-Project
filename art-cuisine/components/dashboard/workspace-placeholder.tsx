import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

function WorkspacePlaceholder({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>

      <Card className="flex flex-col items-center gap-4 px-8 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="font-display text-lg text-text-primary">Module en construction</p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-muted">
            Cet espace fait partie de la prochaine étape de développement du
            back-office ART Cuisine. L&rsquo;accès y est déjà réservé aux rôles
            autorisés.
          </p>
        </div>
      </Card>
    </div>
  );
}

export { WorkspacePlaceholder };
