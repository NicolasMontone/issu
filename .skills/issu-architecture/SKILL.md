---
name: issu-architecture
description: Architecture and development guide for the issu monorepo — a local, opinionated task tracker ("a local Linear"). Use when working ON the issu codebase itself: adding CLI commands, changing the storage format, extending the data model, wiring the future GitHub sync or MCP, or running/adding tests. For driving the CLI to manage tasks, use the `issu` skill instead.
---

# issu — architecture & development

issu is a **local, opinionated task tracker** — a "local Linear". Issues are
plain markdown files on disk, managed through an opinionated CLI. The format is
the product: because tasks are text files, the planned "push to GitHub" feature
is essentially a git commit, not a custom sync protocol.

## Why these decisions

- **Markdown + YAML frontmatter as source of truth** (not SQLite). The end goal
  is GitHub sync, so git is the sync engine for free: readable diffs, merges,
  PRs, blame. A binary DB would force a custom serialization/merge layer that
  would itself serialize back to text. Pattern to preserve: **text is the
  source of truth; any future DB is a derived index**, never authoritative.
- **Global store by default, project store opt-in.** Most task management is
  personal/cross-project, so the default is the global store. A repo can opt
  into a colocated `.issu/` for tasks that travel with the code.
- **Core data model only (v1).** Issues with id, title, description, status,
  priority, labels, assignee, parent (sub-issues), timestamps. No
  projects/cycles/comments yet — add them only when needed.
- **gh-style grammar, but issues are the default entity.** Since the tool *is*
  "issu" (issue), the common path drops the redundant noun: `issu create`,
  `issu ls`, `issu done <id>`. Reserve noun-first (`issu project …`) for other
  entities added later.

## Layout

```
apps/web            @issu/web   Next.js 16 landing page (placeholder for now)
packages/core       @issu/core  storage engine + data model (runtime-portable)
packages/cli        issu        the CLI (Bun-first, #!/usr/bin/env bun)
skills/issu         usage skill: how to DRIVE the CLI to manage tasks
skills/issu-architecture  this skill: how to WORK ON the codebase
```

Tooling: **Turbo + pnpm workspaces**. The CLI is **Bun-first** (Bun APIs,
`bun test`, bin shebang). pnpm is used at the workspace level because v0's
preview runs the Next.js dev server through pnpm; a full Bun-workspace flip is
easy once this moves to a standalone repo.

## packages/core (`@issu/core`)

The reusable heart — deliberately depends only on `node:*` + `gray-matter`, so
the future MCP server and the web app can import it directly.

- `types.ts` — the model. `STATUSES` (backlog, todo, in_progress, done,
  canceled), `PRIORITIES` (0 none, 1 urgent, 2 high, 3 medium, 4 low),
  `Issue`, `CreateIssueInput`, `UpdateIssueInput`, `ListFilter`, `StoreConfig`.
- `paths.ts` — store resolution. `globalStoreDir()` honors `ISSU_HOME` →
  `XDG_CONFIG_HOME/issu` → `~/.config/issu`. `findProjectStore()` walks up from
  cwd looking for `.issu/`. `resolveStore()` encodes the opinion: global by
  default, project when `scope: "project"` or an explicit `dir` is given.
- `store.ts` — `IssueStore` class: `init`, `create`, `get`, `list`, `update`,
  `remove`, `children`. Handles id generation (monotonic counter in
  `config.json`, ids like `WEB-1`), markdown (de)serialization, filtering, and
  priority-then-created sorting (urgent first, none last).

**On-disk layout of a store:**
```
<storeDir>/
  config.json         { version, prefix, counter, name }
  issues/
    WEB-1.md          frontmatter + markdown body
```

**Invariants to preserve when editing the store:**
- Frontmatter keys are written in a fixed order (`toFrontmatter`) for clean,
  deterministic diffs. Don't reorder casually — it churns every file's diff.
- `update()` never lets `id` or `created` be overwritten via a patch, and
  always bumps `updated`.
- `deserialize()` must degrade gracefully on malformed status/priority (falls
  back to `backlog` / `0`) so a hand-edited file never crashes the tool.

## packages/cli (`issu`)

- `index.ts` — entrypoint: command dispatch, help text, top-level error
  handling (a `CliError` prints cleanly and exits non-zero).
- `args.ts` — `storeFromFlags` (maps `--global/--project/--dir` to a store),
  plus forgiving `parseStatus`/`parsePriority` alias tables (e.g. `wip` →
  `in_progress`, `urgent`/`p1`/`1` → priority 1) and label normalization.
- `output.ts` — ANSI rendering (respects `NO_COLOR` and non-TTY): `renderList`,
  `renderTree`, `renderDetail`, status/priority badges.
- `commands/` — one file per command. `_shared.ts` holds the common scope
  options. Transitions (`start`/`done`/`reopen`/`cancel`) live in
  `transition.ts`.

**Adding a command:** create `commands/<name>.ts` exporting an
`async (argv: string[]) => Promise<void>`, parse with `node:util` `parseArgs`
(spread `scopeOptions`), get a store via `storeFromFlags(values)`, and register
it in the dispatch switch + help text in `index.ts`.

## Tests

- **`packages/core/src/*.test.ts`** — unit tests (`bun test`) for store CRUD, id
  generation, markdown round-trip, filter/sort, hierarchy, and path resolution.
  Use `mkdtemp` + a `{ dir, scope }` store; never touch the real global store.
- **`packages/cli/src/cli.test.ts`** — end-to-end: spawns the real binary via
  `Bun.spawn` against an isolated `ISSU_HOME`, asserts on stdout/stderr/exit
  code. Set `NO_COLOR: "1"` so assertions match plain text.

Run everything from the root: `pnpm test` (Turbo fans out to both packages).
Per package: `cd packages/core && bun test`.

## Build & distribution

Both packages are **Bun-first in dev, Node-compatible when published**. Dev
resolves to TypeScript source; `package.json` `publishConfig` swaps the entry
points to compiled `dist/` at publish time (so `bun run start`/tests need no
build).

- **tsup** (esbuild) compiles both packages. `pnpm -r build` → `dist/`.
- **`@issu/core`**: ESM JS + `.d.ts`. `exports` → `src` in dev,
  `publishConfig.exports` → `dist` on npm.
- **`issu` CLI**: a **fully self-contained** ESM bundle — `noExternal` inlines
  `@issu/core` and `gray-matter`, so the published CLI has **zero runtime deps**
  and runs on any Node. The banner injects a `#!/usr/bin/env node` shebang plus a
  `createRequire` shim (bundled CJS like gray-matter calls `require('fs')`).
  `bin` → `src` in dev, `publishConfig.bin` → `dist/index.js` on npm.
- **Future**: the same `src/` can feed `bun build --compile` to produce native
  binaries for a `curl | bash` install path (e.g. `issu.app/install`) served from
  GitHub Releases — additive, not a replacement for the npm bundle.

## Releasing

`CHANGELOG.md` is the **single source of truth** — no version flags, no
conventional-commit parsing. `scripts/release/changelog.mjs` parses the top
`## [x.y.z]` heading (skipping `## [Unreleased]`) and prints its version/notes.
`.github/workflows/release.yml` runs on push to `main`: if the changelog's top
version has no matching `v*` git tag, it tests, stamps that version into both
`package.json`s, publishes `@issu/core` then `issu`, commits the bump, and cuts
a tag + GitHub Release from the notes. Idempotent — an already-tagged version is
a no-op. Both packages stay version-locked. Only secret: `NPM_TOKEN`.

## Not built yet (planned)

- **GitHub sync flag** — the reason for the markdown-first design. Likely a
  `issu sync` that git-commits/pushes the store, or writes issues to GitHub
  Issues. Keep markdown authoritative.
- **MCP server** — should wrap `@issu/core` (same object model as the CLI) so
  agents can drive the local store the way Linear's MCP wraps its GraphQL API.
