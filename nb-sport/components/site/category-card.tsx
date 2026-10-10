import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/types";

export function CategoryCard({ category }: { category: Category }) {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[category.icone] ?? Icons.Dumbbell;
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group nb-card glow-border relative flex flex-col items-center gap-3 overflow-hidden p-6 text-center transition-transform duration-300 hover:-translate-y-1"
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(57,255,138,0.14), transparent 70%)",
        }}
      />
      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-surface-2 transition-transform duration-300 group-hover:scale-110">
        {category.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={category.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-7 w-7 text-accent-strong" strokeWidth={1.5} />
        )}
      </div>
      <span className="relative text-sm font-semibold">{category.nom}</span>
      <ArrowUpRight className="relative h-4 w-4 text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-strong" />
    </Link>
  );
}
