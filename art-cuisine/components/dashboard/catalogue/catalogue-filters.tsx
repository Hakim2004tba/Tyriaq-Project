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
import { CATALOGUE_CATEGORIES, CATALOGUE_AVAILABILITY_STATUSES } from "@/lib/data/operations";

function CatalogueFilters({
  search,
  category,
  availability,
  status,
}: {
  search: string;
  category: string;
  availability: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = React.useState(search);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "toutes" || value === "tous") {
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
        placeholder="Rechercher un article ou un SKU…"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="sm:w-64"
      />

      <Select value={category} onValueChange={(v) => setParam("categorie", v)}>
        <SelectTrigger className="h-11 sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="toutes">Toutes les catégories</SelectItem>
          {CATALOGUE_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={availability} onValueChange={(v) => setParam("disponibilite", v)}>
        <SelectTrigger className="h-11 sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="toutes">Toute disponibilité</SelectItem>
          {CATALOGUE_AVAILABILITY_STATUSES.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => setParam("statut", v)}>
        <SelectTrigger className="h-11 sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous</SelectItem>
          <SelectItem value="actifs">Actifs</SelectItem>
          <SelectItem value="inactifs">Inactifs</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export { CatalogueFilters };
