import { Check } from "lucide-react";
import { PROJECT_STAGES } from "@/lib/data/project-records";
import type { ProjectStage } from "@/lib/data/operations";

function StageStepper({ stage }: { stage: ProjectStage }) {
  const currentIndex = PROJECT_STAGES.indexOf(stage);

  return (
    <ol className="flex flex-col gap-0">
      {PROJECT_STAGES.map((s, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-ink-950 text-text-inverse"
                    : active
                      ? "border-2 border-ink-950 text-ink-950"
                      : "border border-border-default text-text-muted"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {index < PROJECT_STAGES.length - 1 && (
                <span className={`w-px flex-1 ${done ? "bg-ink-950" : "bg-border-default"}`} style={{ minHeight: "1.5rem" }} />
              )}
            </div>
            <p className={`pb-6 text-sm ${active ? "font-semibold text-text-primary" : done ? "text-text-secondary" : "text-text-muted"}`}>
              {s}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export { StageStepper };
