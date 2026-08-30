import { CliError } from "./args.ts";
import { createCommand } from "./commands/create.ts";
import { editCommand } from "./commands/edit.ts";
import { initCommand } from "./commands/init.ts";
import { listCommand } from "./commands/list.ts";
import { removeCommand } from "./commands/remove.ts";
import { transitionCommand } from "./commands/transition.ts";
import { viewCommand } from "./commands/view.ts";
import { c } from "./output.ts";

type Handler = (argv: string[]) => Promise<void>;

const commands: Record<string, Handler> = {
  init: initCommand,
  create: createCommand,
  add: createCommand,
  new: createCommand,
  list: listCommand,
  ls: listCommand,
  view: viewCommand,
  show: viewCommand,
  edit: editCommand,
  update: editCommand,
  done: transitionCommand("done"),
  start: transitionCommand("in_progress"),
  reopen: transitionCommand("todo"),
  cancel: transitionCommand("canceled"),
  rm: removeCommand,
  delete: removeCommand,
};

const HELP = `${c.bold("issu")} — a local, opinionated task tracker (a local Linear)

${c.bold("Usage")}
  issu <command> [options]

${c.bold("Commands")}
  init                 Create a store (global by default; --project for a repo-local store)
  create <title>       Create an issue            ${c.dim("(aliases: add, new)")}
  ls                   List issues                ${c.dim("(alias: list)")}
  view <id>            Show one issue in full      ${c.dim("(alias: show)")}
  edit <id>            Update fields on an issue   ${c.dim("(alias: update)")}
  done <id>            Mark an issue done
  start <id>           Move an issue to in-progress
  reopen <id>          Move an issue back to todo
  cancel <id>          Mark an issue canceled
  rm <id>              Delete an issue             ${c.dim("(alias: delete)")}

${c.bold("Scope flags")} ${c.dim("(on every command)")}
  --global             Use the global store ${c.dim("(default)")}
  --project            Use the nearest .issu store, or create one in the cwd
  --dir <path>         Use an explicit store directory

${c.bold("Common options")}
  create/edit: -d/--desc  -s/--status  -p/--priority  -l/--label  -a/--assignee  --parent
  ls:          -s/--status  -p/--priority  -l/--label  -a/--assignee  -q/--query  -t/--tree  --all
  everywhere:  --json

${c.bold("Examples")}
  issu init --project --prefix WEB
  issu create "Fix login redirect" -p urgent -l bug -l auth
  issu create "Write tests" --parent WEB-1
  issu ls --tree
  issu ls -s in_progress
  issu done WEB-1
`;

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }
  if (cmd === "version" || cmd === "--version" || cmd === "-v") {
    console.log("issu 0.0.0");
    return;
  }

  const handler = commands[cmd];
  if (!handler) {
    console.error(c.red(`Unknown command "${cmd}".`));
    console.error(c.dim('Run "issu help" to see available commands.'));
    process.exit(1);
  }

  await handler(rest);
}

main().catch((err: unknown) => {
  if (err instanceof CliError) {
    console.error(c.red(err.message));
  } else {
    console.error(c.red("Unexpected error:"), err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
