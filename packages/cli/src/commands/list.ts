import { parseArgs } from "node:util";
import type { Issue, ListFilter } from "@issu/core";
import { parsePriority, parseStatus, storeFromFlags } from "../args.ts";
import { renderList, renderTree } from "../output.ts";
import { scopeOptions } from "./_shared.ts";

export async function listCommand(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      ...scopeOptions,
      status: { type: "string", short: "s" },
      priority: { type: "string", short: "p" },
      label: { type: "string", short: "l" },
      assignee: { type: "string", short: "a" },
      query: { type: "string", short: "q" },
      all: { type: "boolean" },
      tree: { type: "boolean", short: "t" },
      json: { type: "boolean" },
    },
  });

  const store = storeFromFlags(values);

  const filter: ListFilter = {
    label: typeof values.label === "string" ? values.label : undefined,
    assignee: typeof values.assignee === "string" ? values.assignee : undefined,
    query: typeof values.query === "string" ? values.query : undefined,
  };
  if (values.status) filter.status = parseStatus(String(values.status));
  if (values.priority) filter.priority = parsePriority(String(values.priority));

  // By default hide done/canceled unless --all or an explicit status filter is given.
  const hideClosed = !values.all && !values.status;

  let issues = await store.list(filter);
  if (hideClosed) issues = issues.filter((i) => i.status !== "done" && i.status !== "canceled");

  if (values.json) {
    console.log(JSON.stringify(issues, null, 2));
    return;
  }

  if (values.tree) {
    const byId = new Map(issues.map((i) => [i.id, i] as const));
    const roots = issues.filter((i) => !i.parent || !byId.has(i.parent));
    const childrenOf = (id: string): Issue[] => issues.filter((i) => i.parent === id);
    console.log(renderTree(roots, childrenOf));
    return;
  }

  console.log(renderList(issues));
}
