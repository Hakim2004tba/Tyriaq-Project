"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DEVIS_STATUSES, COMMERCIALS } from "@/lib/data/operations";

function DevisFilters({
  search,
  status,
  commercial,
  hideCommercial = false,
}: {
  search: string;
  status: string;
  commercial: string;
  hideCommercial?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = React.useState(search);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "tous") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (searchValue !== search) setParam("q", searchValue);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        icon={<Search />}
        placeholder="Rechercher un devis…"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="sm:w-64"
      />

      <Select value={status} onValueChange={(v) => setParam("statut", v)}>
        <SelectTrigger className="h-11 sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous les statuts</SelectItem>
          {DEVIS_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!hideCommercial && (
        <Select value={commercial} onValueChange={(v) => setParam("commercial", v)}>
          <SelectTrigger className="h-11 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les commerciaux</SelectItem>
            {COMMERCIALS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export { DevisFilters };
