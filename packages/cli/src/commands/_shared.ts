import type { ParseArgsConfig } from "node:util";

type Options = NonNullable<ParseArgsConfig["options"]>;

/** Store-selection flags shared by every command. Global is the default scope. */
export const scopeOptions = {
  project: { type: "boolean" },
  global: { type: "boolean" },
  dir: { type: "string" },
} satisfies Options;
