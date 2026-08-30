import { parseArgs } from "node:util";
import { CliError, storeFromFlags } from "../args.ts";
import { renderDetail } from "../output.ts";
import { scopeOptions } from "./_shared.ts";

export async function viewCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ...scopeOptions,
      json: { type: "boolean" },
    },
  });

  const id = positionals[0];
  if (!id) throw new CliError("An issue id is required. Usage: issu view ISS-1");

  const store = storeFromFlags(values);
  const issue = await store.get(id);
  if (!issue) throw new CliError(`Issue ${id} not found.`);
  const children = await store.children(id);

  if (values.json) {
    console.log(JSON.stringify({ ...issue, children }, null, 2));
    return;
  }
  console.log(renderDetail(issue, children));
}
