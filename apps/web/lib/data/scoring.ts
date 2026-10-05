import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import type { Person } from "./task-types";
import {
  EMPTY_SCORING,
  type ProjectScoring,
  type ScoreEvent,
  type ScoreWeight,
} from "./scoring-types";

/**
 * Standings, and the rules behind them.
 *
 * Read together because they are read together: a number nobody can
 * trace back to a rule is a number people argue with rather than act
 * on, so the screen that shows the leaderboard also shows what earns.
 */

/**
 * `period` narrows the standings.
 *
 * A monthly board is the default because an all-time one is a tenure
 * chart: the person who joined first wins forever, and nobody who joins
 * later has a reason to look at it twice.
 */
export const getProjectScoring = cache(
  async (projectId: string, since: string | null, people: Person[]): Promise<ProjectScoring> => {
    const supabase = await createClient();

    const [{ data: rules, error: rulesError }, { data: board, error: boardError }] =
      await Promise.all([
        supabase
          .from("scoring_rules")
          .select("id, event, points, weight, daily_cap, enabled")
          .eq("project_id", projectId)
          .order("event", { ascending: true }),
        supabase.rpc("project_leaderboard", { p_project: projectId, p_since: since }),
      ]);

    reportReadError("getProjectScoring:rules", rulesError);
    reportReadError("getProjectScoring:leaderboard", boardError);

    const ruleRows = (rules ?? []) as unknown as {
      id: string; event: ScoreEvent; points: number; weight: ScoreWeight;
      daily_cap: number | null; enabled: boolean;
    }[];

    // No rules at all means scoring was never turned on for this
    // project, which is different from everybody having zero points.
    if (ruleRows.length === 0) return EMPTY_SCORING;

    const byId = new Map(people.map((person) => [person.id, person]));

    const standings = ((board ?? []) as unknown as {
      user_id: string; points: number; completed: number; on_time: number;
      kudos_received: number; last_earned: string | null;
    }[]).map((row) => ({
      person: byId.get(row.user_id) ?? { id: row.user_id, name: "Former member" },
      points: row.points,
      completed: row.completed,
      onTime: row.on_time,
      kudos: row.kudos_received,
      lastEarned: row.last_earned,
      /*
        Null rather than 0% when nothing has been completed. "0% on
        time" next to somebody who has finished nothing reads as a
        failure rather than as an absence.
      */
      onTimeRate: row.completed > 0 ? Math.round((row.on_time / row.completed) * 100) : null,
    }));

    const [{ data: recent }, { data: kudosLeft }] = await Promise.all([
      supabase
        .from("score_events")
        .select("id, event, points, reason, created_at, tasks(title), profiles!actor_id(full_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.rpc("kudos_remaining", { p_project: projectId }),
    ]);

    return {
      enabled: true,
      rules: ruleRows.map((row) => ({
        id: row.id,
        event: row.event,
        points: row.points,
        weight: row.weight,
        dailyCap: row.daily_cap,
        enabled: row.enabled,
      })),
      leaderboard: standings,
      recent: ((recent ?? []) as unknown as {
        id: string; event: ScoreEvent; points: number; reason: string | null;
        created_at: string;
        tasks: { title: string } | null;
        profiles: { full_name: string } | null;
      }[]).map((row) => ({
        id: row.id,
        event: row.event,
        points: row.points,
        reason: row.reason,
        taskTitle: row.tasks?.title ?? null,
        actorName: row.profiles?.full_name ?? null,
        at: row.created_at,
      })),
      kudosLeft: typeof kudosLeft === "number" ? kudosLeft : 0,
    };
  }
);

export * from "./scoring-types";
