import { parseArgs } from "node:util";
import type { Status } from "@issu/core";
import { CliError, storeFromFlags } from "../args.ts";
import { c, statusBadge } from "../output.ts";
import { scopeOptions } from "./_shared.ts";

/** Factory for the status-shortcut commands: done, start, reopen, cancel. */
export function transitionCommand(target: Status) {
  return async (argv: string[]): Promise<void> => {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { ...scopeOptions, json: { type: "boolean" } },
    });

    const id = positionals[0];
    if (!id) throw new CliError(`An issue id is required. Usage: issu ${aliasFor(target)} ISS-1`);

    const store = storeFromFlags(values);
    const issue = await store.update(id, { status: target });

    if (values.json) {
      console.log(JSON.stringify(issue, null, 2));
      return;
    }
    console.log(`${c.bold(issue.id)} → ${statusBadge(issue.status)}`);
  };
}

function aliasFor(status: Status): string {
  switch (status) {
    case "done":
      return "done";
    case "in_progress":
      return "start";
    case "todo":
      return "reopen";
    case "canceled":
      return "cancel";
    default:
      return "edit";
  }
}
