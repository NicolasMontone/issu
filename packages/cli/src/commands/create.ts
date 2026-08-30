import { parseArgs } from "node:util";
import { CliError, parsePriority, parseStatus, storeFromFlags, toLabelArray } from "../args.ts";
import { c, renderDetail } from "../output.ts";
import { scopeOptions } from "./_shared.ts";

export async function createCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ...scopeOptions,
      desc: { type: "string", short: "d" },
      status: { type: "string", short: "s" },
      priority: { type: "string", short: "p" },
      label: { type: "string", short: "l", multiple: true },
      assignee: { type: "string", short: "a" },
      parent: { type: "string" },
      json: { type: "boolean" },
    },
  });

  const title = positionals.join(" ").trim();
  if (!title) throw new CliError('A title is required. Usage: issu create "Fix the thing"');

  const store = storeFromFlags(values);
  const issue = await store.create({
    title,
    description: typeof values.desc === "string" ? values.desc : undefined,
    status: values.status ? parseStatus(String(values.status)) : undefined,
    priority: values.priority ? parsePriority(String(values.priority)) : undefined,
    labels: toLabelArray(values.label),
    assignee: typeof values.assignee === "string" ? values.assignee : undefined,
    parent: typeof values.parent === "string" ? values.parent : undefined,
  });

  if (values.json) {
    console.log(JSON.stringify(issue, null, 2));
    return;
  }
  console.log(c.green(`Created ${c.bold(issue.id)}`));
  console.log("");
  console.log(renderDetail(issue, []));
}
