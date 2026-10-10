import {
  Footprints,
  Shirt,
  Dumbbell,
  Volleyball,
  Backpack,
  Watch,
  HeartPulse,
  Zap,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  shoe: Footprints,
  jacket: Shirt,
  dumbbell: Dumbbell,
  ball: Volleyball,
  backpack: Backpack,
  cap: Watch,
  watch: Watch,
  mat: HeartPulse,
  shorts: Shirt,
  rope: Zap,
  placeholder: ShoppingBag,
};

function resolveIcon(key: string): LucideIcon {
  const base = key.split("-")[0];
  return ICONS[base] ?? ShoppingBag;
}

const PALETTES = [
  "from-emerald-500/25 via-emerald-400/5",
  "from-green-400/25 via-green-500/5",
  "from-teal-400/20 via-emerald-500/5",
  "from-lime-400/20 via-green-500/5",
];

function paletteFor(key: string) {
  let hash = 0;
  for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) % PALETTES.length;
  return PALETTES[hash];
}

export function ProductVisual({
  imageKey = "placeholder",
  className,
  iconClassName,
}: {
  imageKey?: string;
  className?: string;
  iconClassName?: string;
}) {
  if (imageKey.startsWith("http://") || imageKey.startsWith("https://")) {
    return (
      <div className={cn("relative overflow-hidden bg-surface-2", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageKey} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const Icon = resolveIcon(imageKey);
  const palette = paletteFor(imageKey);
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-surface-2",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", palette)} />
      <div className="absolute inset-0 nb-noise" />
      <div
        className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-accent/20 blur-2xl"
        aria-hidden
      />
      <Icon
        className={cn("relative text-accent-strong drop-shadow-[0_0_18px_rgba(57,255,138,0.35)]", iconClassName)}
        strokeWidth={1.4}
      />
    </div>
  );
}
