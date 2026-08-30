import {
  IssueStore,
  PRIORITY_LABELS,
  STATUSES,
  type Priority,
  type Status,
  type StoreScope,
} from "@issu/core";

export class CliError extends Error {}

/** Resolve the store from global flags (--project / --global / --dir). */
export function storeFromFlags(values: Record<string, unknown>): IssueStore {
  const scope: StoreScope | undefined = values.project
    ? "project"
    : values.global
      ? "global"
      : undefined;
  const dir = typeof values.dir === "string" ? values.dir : undefined;
  return IssueStore.resolve({ scope, dir });
}

const STATUS_ALIASES: Record<string, Status> = {
  backlog: "backlog",
  todo: "todo",
  next: "todo",
  in_progress: "in_progress",
  "in-progress": "in_progress",
  progress: "in_progress",
  wip: "in_progress",
  started: "in_progress",
  doing: "in_progress",
  done: "done",
  complete: "done",
  completed: "done",
  closed: "done",
  canceled: "canceled",
  cancelled: "canceled",
};

export function parseStatus(input: string): Status {
  const key = input.trim().toLowerCase();
  const status = STATUS_ALIASES[key];
  if (!status) {
    throw new CliError(
      `Invalid status "${input}". Expected one of: ${STATUSES.join(", ")}.`,
    );
  }
  return status;
}

const PRIORITY_ALIASES: Record<string, Priority> = {
  "0": 0,
  none: 0,
  no: 0,
  "1": 1,
  urgent: 1,
  p1: 1,
  "2": 2,
  high: 2,
  p2: 2,
  "3": 3,
  medium: 3,
  med: 3,
  p3: 3,
  "4": 4,
  low: 4,
  p4: 4,
};

export function parsePriority(input: string): Priority {
  const key = input.trim().toLowerCase();
  const priority = PRIORITY_ALIASES[key];
  if (priority === undefined) {
    throw new CliError(
      `Invalid priority "${input}". Use 0-4 or: ${Object.values(PRIORITY_LABELS).join(", ")}.`,
    );
  }
  return priority;
}

/** Normalize a --label flag that may be a single string or an array into string[]. */
export function toLabelArray(value: unknown): string[] {
  if (value === undefined) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}
