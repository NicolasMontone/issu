import { parseArgs } from "node:util";
import type { UpdateIssueInput } from "@issu/core";
import { CliError, parsePriority, parseStatus, storeFromFlags, toLabelArray } from "../args.ts";
import { c, renderDetail } from "../output.ts";
import { scopeOptions } from "./_shared.ts";

export async function editCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ...scopeOptions,
      title: { type: "string" },
      desc: { type: "string", short: "d" },
      status: { type: "string", short: "s" },
      priority: { type: "string", short: "p" },
      label: { type: "string", short: "l", multiple: true },
      assignee: { type: "string", short: "a" },
      parent: { type: "string" },
      json: { type: "boolean" },
    },
  });

  const id = positionals[0];
  if (!id) throw new CliError("An issue id is required. Usage: issu edit ISS-1 --status done");

  const patch: UpdateIssueInput = {};
  if (typeof values.title === "string") patch.title = values.title;
  if (typeof values.desc === "string") patch.description = values.desc;
  if (values.status) patch.status = parseStatus(String(values.status));
  if (values.priority) patch.priority = parsePriority(String(values.priority));
  if (values.label !== undefined) patch.labels = toLabelArray(values.label);
  if (values.assignee !== undefined) patch.assignee = values.assignee === "" ? null : String(values.assignee);
  if (values.parent !== undefined) patch.parent = values.parent === "" ? null : String(values.parent);

  if (Object.keys(patch).length === 0) {
    throw new CliError("Nothing to update. Pass at least one field, e.g. --status done.");
  }

  const store = storeFromFlags(values);
  const issue = await store.update(id, patch);

  if (values.json) {
    console.log(JSON.stringify(issue, null, 2));
    return;
  }
  console.log(c.green(`Updated ${c.bold(issue.id)}`));
  console.log("");
  console.log(renderDetail(issue, await store.children(id)));
}
