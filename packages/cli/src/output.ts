import { PRIORITY_LABELS, type Issue, type Priority, type Status } from "@issu/core";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function paint(code: number, s: string): string {
  return useColor ? `\x1b[${code}m${s}\x1b[0m` : s;
}

export const c = {
  dim: (s: string) => paint(2, s),
  bold: (s: string) => paint(1, s),
  red: (s: string) => paint(31, s),
  green: (s: string) => paint(32, s),
  yellow: (s: string) => paint(33, s),
  blue: (s: string) => paint(34, s),
  magenta: (s: string) => paint(35, s),
  cyan: (s: string) => paint(36, s),
  gray: (s: string) => paint(90, s),
};

const STATUS_STYLE: Record<Status, (s: string) => string> = {
  backlog: c.gray,
  todo: c.blue,
  in_progress: c.yellow,
  done: c.green,
  canceled: c.dim,
};

const STATUS_GLYPH: Record<Status, string> = {
  backlog: "○",
  todo: "◔",
  in_progress: "◐",
  done: "●",
  canceled: "✕",
};

const PRIORITY_STYLE: Record<Priority, (s: string) => string> = {
  0: c.gray,
  1: c.red,
  2: c.magenta,
  3: c.cyan,
  4: c.dim,
};

export function statusBadge(status: Status): string {
  return STATUS_STYLE[status](`${STATUS_GLYPH[status]} ${status}`);
}

export function priorityBadge(priority: Priority): string {
  return PRIORITY_STYLE[priority](PRIORITY_LABELS[priority]);
}

function padEnd(s: string, len: number): string {
  // pad based on visible length (strip ANSI) so columns line up
  const visible = s.replace(/\x1b\[[0-9;]*m/g, "").length;
  return s + " ".repeat(Math.max(0, len - visible));
}

/** Render a flat list of issues as an aligned table. */
export function renderList(issues: Issue[]): string {
  if (issues.length === 0) return c.dim("No issues found.");
  const idWidth = Math.max(...issues.map((i) => i.id.length), 2);
  const rows = issues.map((i) => {
    const id = padEnd(c.bold(i.id), idWidth);
    const glyph = STATUS_STYLE[i.status](STATUS_GLYPH[i.status]);
    const pri = padEnd(priorityBadge(i.priority), 6);
    const labels = i.labels.length ? c.dim(` #${i.labels.join(" #")}`) : "";
    const sub = i.parent ? c.dim(` ↳ ${i.parent}`) : "";
    return `${id}  ${glyph}  ${pri}  ${i.title}${labels}${sub}`;
  });
  return rows.join("\n");
}

/** Render a parent → children tree. `roots` are top-level issues. */
export function renderTree(
  roots: Issue[],
  childrenOf: (id: string) => Issue[],
  depth = 0,
): string {
  const lines: string[] = [];
  for (const issue of roots) {
    const indent = "  ".repeat(depth);
    const glyph = STATUS_STYLE[issue.status](STATUS_GLYPH[issue.status]);
    lines.push(`${indent}${glyph} ${c.bold(issue.id)} ${issue.title}`);
    const kids = childrenOf(issue.id);
    if (kids.length) lines.push(renderTree(kids, childrenOf, depth + 1));
  }
  return lines.join("\n");
}

/** Render full detail for a single issue. */
export function renderDetail(issue: Issue, children: Issue[]): string {
  const lines: string[] = [];
  lines.push(`${c.bold(issue.id)}  ${c.bold(issue.title)}`);
  lines.push("");
  lines.push(`${c.dim("status")}    ${statusBadge(issue.status)}`);
  lines.push(`${c.dim("priority")}  ${priorityBadge(issue.priority)}`);
  if (issue.assignee) lines.push(`${c.dim("assignee")}  ${issue.assignee}`);
  if (issue.labels.length) lines.push(`${c.dim("labels")}    ${issue.labels.map((l) => `#${l}`).join(" ")}`);
  if (issue.parent) lines.push(`${c.dim("parent")}    ${issue.parent}`);
  lines.push(`${c.dim("created")}   ${issue.created}`);
  lines.push(`${c.dim("updated")}   ${issue.updated}`);
  if (issue.description) {
    lines.push("");
    lines.push(issue.description);
  }
  if (children.length) {
    lines.push("");
    lines.push(c.dim(`sub-issues (${children.length}):`));
    lines.push(renderList(children));
  }
  return lines.join("\n");
}
