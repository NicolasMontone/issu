import { parseArgs } from "node:util";
import { CliError, storeFromFlags } from "../args.ts";
import { c } from "../output.ts";
import { scopeOptions } from "./_shared.ts";

export async function removeCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { ...scopeOptions, force: { type: "boolean", short: "f" } },
  });

  const id = positionals[0];
  if (!id) throw new CliError("An issue id is required. Usage: issu rm ISS-1");

  const store = storeFromFlags(values);
  const issue = await store.get(id);
  if (!issue) throw new CliError(`Issue ${id} not found.`);

  const kids = await store.children(id);
  if (kids.length && !values.force) {
    throw new CliError(
      `${id} has ${kids.length} sub-issue(s). Re-run with --force to delete it anyway.`,
    );
  }

  await store.remove(id);
  console.log(c.red(`Deleted ${c.bold(id)}`) + c.dim(` (${issue.title})`));
}
