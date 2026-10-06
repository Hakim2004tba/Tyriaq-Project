import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { isNotInstalled } from "./feature-state";
import type { AutomationAction, AutomationTrigger } from "@/lib/automations/run";

/**
 * The rules on a project, and what they have been doing.
 *
 * The run log is read alongside them rather than on demand: a rule
 * nobody can see the effects of is one nobody trusts, and "last ran 2
 * hours ago" belongs next to the rule, not behind a click.
 */

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: Record<string, string>;
  actions: AutomationAction[];
  /** The most recent run, for the line under the rule. */
  lastRun: { at: string; status: "ok" | "skipped" | "failed"; detail: string | null } | null;
  runCount: number;
}

export const getAutomations = cache(async (projectId: string): Promise<Automation[] | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("automations")
    .select("id, name, enabled, trigger, conditions, actions")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  // A missing table means the feature was never installed, which the
  // dialog says plainly instead of offering to write the first rule.
  if (isNotInstalled(error)) return null;
  reportReadError("getAutomations", error);

  const rules = (data ?? []) as unknown as Omit<Automation, "lastRun" | "runCount">[];
  if (rules.length === 0) return [];

  /*
    One query for every rule's history rather than one each. A project
    with a dozen rules would otherwise issue a dozen requests to draw a
    settings page nobody opens twice a day.
  */
  const { data: runs } = await supabase
    .from("automation_runs")
    .select("automation_id, status, detail, created_at")
    .in("automation_id", rules.map((rule) => rule.id))
    .order("created_at", { ascending: false })
    .limit(300);

  const latest = new Map<string, Automation["lastRun"]>();
  const counts = new Map<string, number>();
  for (const run of (runs ?? []) as {
    automation_id: string; status: "ok" | "skipped" | "failed"; detail: string | null; created_at: string;
  }[]) {
    counts.set(run.automation_id, (counts.get(run.automation_id) ?? 0) + 1);
    if (!latest.has(run.automation_id)) {
      latest.set(run.automation_id, {
        at: run.created_at,
        status: run.status,
        detail: run.detail,
      });
    }
  }

  return rules.map((rule) => ({
    ...rule,
    conditions: rule.conditions ?? {},
    actions: rule.actions ?? [],
    lastRun: latest.get(rule.id) ?? null,
    runCount: counts.get(rule.id) ?? 0,
  }));
});
