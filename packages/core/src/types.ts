/**
 * The core data model for issu. Deliberately small (v1 "Core" scope):
 * issues with status, priority, labels, assignee, and parent/sub-issue links.
 */

/** Workflow states, mirroring Linear's status groups in a flattened form. */
export const STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "done",
  "canceled",
] as const;
export type Status = (typeof STATUSES)[number];

/**
 * Priority mirrors Linear's numeric scale so the mental model transfers:
 * 0 = none, 1 = urgent, 2 = high, 3 = medium, 4 = low.
 */
export const PRIORITIES = [0, 1, 2, 3, 4] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  0: "none",
  1: "urgent",
  2: "high",
  3: "medium",
  4: "low",
};

/** A single issue. `description` is the markdown body; everything else is frontmatter. */
export interface Issue {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  labels: string[];
  assignee: string | null;
  parent: string | null;
  created: string;
  updated: string;
}

/** The frontmatter shape persisted to disk (everything on an Issue except the body). */
export type IssueFrontmatter = Omit<Issue, "description">;

/** Fields accepted when creating an issue. */
export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  labels?: string[];
  assignee?: string | null;
  parent?: string | null;
}

/** Fields accepted when updating an issue. All optional. */
export type UpdateIssueInput = Partial<
  Pick<
    Issue,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "labels"
    | "assignee"
    | "parent"
  >
>;

/** Filters for listing issues. */
export interface ListFilter {
  status?: Status | Status[];
  priority?: Priority | Priority[];
  label?: string;
  assignee?: string;
  parent?: string | null;
  /** Free-text match against id, title, and description. */
  query?: string;
}

export interface StoreConfig {
  version: number;
  /** Issue id prefix, e.g. "ISS" produces ISS-1, ISS-2. */
  prefix: string;
  /** Monotonic counter for id generation. */
  counter: number;
  /** Human-friendly workspace name. */
  name?: string;
}

export type StoreScope = "global" | "project";
