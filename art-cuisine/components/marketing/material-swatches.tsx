import { cn } from "@/lib/utils";

const SWATCHES = [
  {
    label: "Bois massif",
    className: "bg-[linear-gradient(115deg,#8a6a45_0%,#a9835a_38%,#7c5c3a_62%,#96754c_100%)]",
    rotate: "-rotate-6",
    size: "h-40 w-40",
    z: "z-10",
    offset: "left-0 top-10",
  },
  {
    label: "Pierre naturelle",
    className: "bg-[linear-gradient(125deg,var(--stone-200)_0%,var(--stone-400)_45%,var(--stone-300)_75%,var(--stone-500)_100%)]",
    rotate: "rotate-3",
    size: "h-36 w-36",
    z: "z-20",
    offset: "left-24 top-0",
  },
  {
    label: "Marbre",
    className:
      "bg-[linear-gradient(135deg,#efece6_0%,#dcd6cb_30%,#efece6_45%,#c9c1b2_55%,#efece6_70%,#d8d1c4_100%)]",
    rotate: "-rotate-3",
    size: "h-44 w-44",
    z: "z-30",
    offset: "left-16 top-28",
  },
  {
    label: "Métal",
    className: "bg-[linear-gradient(160deg,#3a3a3c_0%,#5a5a5e_35%,#2c2c2e_60%,#4a4a4d_100%)]",
    rotate: "rotate-6",
    size: "h-32 w-32",
    z: "z-40",
    offset: "left-44 top-16",
  },
] as const;

function MaterialSwatches({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-80 w-full", className)}>
      {SWATCHES.map((s) => (
        <div
          key={s.label}
          className={cn(
            "absolute rounded-md border border-black/10 shadow-elevation-lg transition-transform duration-500 ease-[var(--ease-editorial)] hover:-translate-y-1.5",
            s.className,
            s.rotate,
            s.size,
            s.z,
            s.offset,
          )}
        >
          <span className="absolute bottom-3 left-3 rounded-sm bg-ink-950/75 px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            {s.label}
          </span>
        </div>
      ))}
      <div className="absolute -right-2 bottom-6 h-16 w-16 rotate-12 rounded-md border border-gold-400/40 bg-gradient-to-br from-gold-300 to-gold-600 shadow-elevation-gold" />
    </div>
  );
}

export { MaterialSwatches };
