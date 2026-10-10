"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PERIOD_OPTIONS, PROJECT_STAGES as STAGES, type PeriodKey } from "@/lib/data/operations";

function DashboardFilters({ period, stage }: { period: PeriodKey; stage: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "tous" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={period} onValueChange={(v) => setParam("periode", v)}>
        <SelectTrigger className="h-10 w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={stage} onValueChange={(v) => setParam("etape", v)}>
        <SelectTrigger className="h-10 w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Toutes les étapes</SelectItem>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { DashboardFilters };
