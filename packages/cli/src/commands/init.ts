import { parseArgs } from "node:util";
import { storeFromFlags } from "../args.ts";
import { c } from "../output.ts";
import { scopeOptions } from "./_shared.ts";

export async function initCommand(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      ...scopeOptions,
      prefix: { type: "string" },
      name: { type: "string" },
    },
  });

  const store = storeFromFlags(values);
  const already = store.exists();
  const config = await store.init({
    prefix: typeof values.prefix === "string" ? values.prefix : undefined,
    name: typeof values.name === "string" ? values.name : undefined,
  });

  if (already) {
    console.log(c.yellow(`Store already initialized at ${store.dir}`));
  } else {
    console.log(c.green(`Initialized ${store.scope} issu store at ${store.dir}`));
  }
  console.log(c.dim(`prefix: ${config.prefix}  ·  ids look like ${config.prefix}-1`));
}
