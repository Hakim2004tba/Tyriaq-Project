import type { Person } from "./task-types";

/**
 * The shape of a score, and the words for it.
 *
 * Separate from `scoring.ts` because that file reads cookies to find
 * the caller, which drags `next/headers` into anything importing it —
 * and the scoreboard is a client component that needs these types and
 * these labels. A pure module is the seam.
 */

export type ScoreEvent =
  | "task_completed"
  | "completed_on_time"
  | "completed_early"
  | "review_passed"
  | "kudos_received"
  | "comment_posted"
  | "time_logged";

export type ScoreWeight = "flat" | "estimate" | "priority";

export interface ScoringRule {
  id: string;
  event: ScoreEvent;
  points: number;
  weight: ScoreWeight;
  dailyCap: number | null;
  enabled: boolean;
}

export interface LeaderboardRow {
  person: Person;
  points: number;
  completed: number;
  onTime: number;
  kudos: number;
  lastEarned: string | null;
  /** Share of their finished work that landed by its due date. */
  onTimeRate: number | null;
}

export interface ScoreEntry {
  id: string;
  event: ScoreEvent;
  points: number;
  reason: string | null;
  taskTitle: string | null;
  actorName: string | null;
  at: string;
}

export interface ProjectScoring {
  enabled: boolean;
  rules: ScoringRule[];
  leaderboard: LeaderboardRow[];
  /** The most recent awards, so the board can be read as a story. */
  recent: ScoreEntry[];
  /** How many kudos the caller has left to give this week. */
  kudosLeft: number;
}

export const EMPTY_SCORING: ProjectScoring = {
  enabled: false,
  rules: [],
  leaderboard: [],
  recent: [],
  kudosLeft: 0,
};

/** "Finishing a task", not "task_completed". */
export const EVENT_LABEL: Record<ScoreEvent, string> = {
  task_completed: "Finishing a task",
  completed_on_time: "Finishing it by its due date",
  completed_early: "Finishing it early",
  review_passed: "Work that passed review",
  kudos_received: "Being thanked by a teammate",
  comment_posted: "Taking part in a discussion",
  time_logged: "Logging time",
};

export const WEIGHT_LABEL: Record<ScoreWeight, string> = {
  flat: "the same for every task",
  estimate: "per hour estimated",
  priority: "more for urgent work",
};
