import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * The rail's upsell.
 *
 * This is the ONE cosmic surface permitted in the shell — it is the only
 * place in the chrome that is allowed to be decorative, and it earns it
 * by being the only thing in the rail that is not navigation. Every
 * other nebula surface in a given viewport must therefore live in the
 * content area, not here.
 */
export function UpgradeCard() {
  return (
    <div className="tq-cosmic rounded-lg border border-border-brand bg-sidebar-elevated p-3.5">
      <p className="flex items-center gap-1.5 text-body-sm font-semibold text-text-primary">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        Tyriaq Pro
      </p>
      <p className="mt-1 text-caption leading-[17px] text-text-secondary">
        Unlimited spaces, automations and advanced reporting.
      </p>
      <Link
        href="/app/settings/workspace/billing"
        className="mt-3 flex h-8 items-center justify-center rounded-md bg-brand text-label font-medium text-white
                   shadow-glow-sm transition-all duration-fast hover:bg-brand-hover hover:shadow-glow-md
                   focus-visible:outline-none focus-visible:shadow-focus"
      >
        Upgrade
      </Link>
    </div>
  );
}
