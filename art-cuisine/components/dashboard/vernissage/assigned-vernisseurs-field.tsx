"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VERNISSAGE_TEAM } from "@/lib/data/vernissage";

function AssignedVernisseursField({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  function toggle(name: string, checked: boolean) {
    onChange(checked ? [...selected, name] : selected.filter((w) => w !== name));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Vernisseurs assignés</Label>
      <div className="grid grid-cols-2 gap-2.5 rounded-md border border-border-default bg-surface-raised p-3.5">
        {VERNISSAGE_TEAM.map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm text-text-secondary">
            <Checkbox checked={selected.includes(name)} onCheckedChange={(v) => toggle(name, v === true)} />
            {name}
          </label>
        ))}
      </div>
    </div>
  );
}

export { AssignedVernisseursField };
