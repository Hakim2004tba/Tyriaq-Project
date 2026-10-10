import { cn } from "@/lib/utils";

function Logo({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex flex-col leading-none select-none",
        inverse ? "text-text-inverse" : "text-text-primary",
        className,
      )}
    >
      <span className="font-display text-2xl tracking-[0.08em]">ART</span>
      <span
        className={cn(
          "mt-1 text-[0.625rem] font-medium tracking-[0.45em]",
          inverse ? "text-gold-400" : "text-text-accent",
        )}
      >
        CUISINE
      </span>
    </span>
  );
}

export { Logo };
