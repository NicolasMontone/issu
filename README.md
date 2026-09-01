# issu

A local, opinionated task tracker — **a Linear you own**. Every issue is a plain
markdown file with YAML frontmatter, stored on disk. Because the store is plain
text, it's **git-syncable by design**: the eventual "push to GitHub" flow is
just committing those files.

No account. No server. No SQLite blob. Just markdown you can read, hand-edit,
grep, and version with the rest of your work.

## Why markdown, not a database

The deciding factor is sync. With markdown files, **git is the sync engine for
free** — `commit`, `push`, PRs, merges, and blame all work out of the box, and
conflicts are human-readable. A binary SQLite database would need a custom
serialization and merge layer bolted on top. Text stays the source of truth; if
query speed ever matters at scale, a throwaway index can be derived from it.

## Quick start

```bash
# Create a store (global by default, lives in ~/.config/issu)
issu init

# Or a repo-local store, with ids like WEB-1
issu init --project --prefix WEB

# Create issues
issu create "Fix login redirect" -p urgent -l bug -d "Users bounce to / after login."
issu create "Write regression test" --parent WEB-1 -p high

# See the plan
issu ls --tree

# Move work along
issu start WEB-1
issu done WEB-1
```

## The mental model

- **One issue = one unit of work** someone could pick up and finish.
- **Hierarchy via `--parent`** — a large effort becomes a parent with sub-issues.
  Keep it shallow.
- **Status is a workflow:** `backlog` → `todo` → `in_progress` → `done`
  (or `canceled`).
- **Priority mirrors Linear:** `urgent`, `high`, `medium`, `low`, `none`.
- **Labels are cross-cutting facets** (`bug`, `auth`, `perf`) — keep the
  vocabulary small.

## Storage model

Issues live in a **global** store (`~/.config/issu`, the default) or a
**project** store (`.issu/` inside a repo, opt-in with `--project`). The project
store is discovered by walking up from the current directory, the same way git
finds `.git`.

```
<store>/
  config.json          # prefix, counter, workspace name
  issues/
    WEB-1.md           # frontmatter (status, priority, labels, parent…) + body
    WEB-2.md
```

A single issue file looks like:

```markdown
---
id: WEB-1
title: Fix login redirect
status: in_progress
priority: urgent
labels:
  - bug
  - auth
parent: null
created: 2026-08-29T12:00:00.000Z
updated: 2026-08-29T12:30:00.000Z
---

Users bounce to / after login instead of the dashboard.
```

Frontmatter keys are written in a **stable order** so diffs stay clean, and the
parser tolerates hand-edited or partial files without crashing.

## Command reference

Scope flags apply to every command: `--global` (default), `--project`, or
`--dir <path>`. Add `--json` anywhere for machine-readable output.

| Command | Description |
| --- | --- |
| `issu init` | Create a store (`--project`, `--prefix`, `--name`) |
| `issu create <title>` | New issue (`-d`, `-s`, `-p`, `-l`, `-a`, `--parent`) — aliases: `add`, `new` |
| `issu ls` | List open issues (`--all`, `--tree`, `-s`, `-l`, `-p`, `-q`) — alias: `list` |
| `issu view <id>` | Full detail incl. sub-issues — alias: `show` |
| `issu edit <id>` | Update fields — alias: `update` |
| `issu start <id>` | Move to `in_progress` |
| `issu done <id>` | Move to `done` |
| `issu reopen <id>` | Move back to `todo` |
| `issu cancel <id>` | Move to `canceled` |
| `issu rm <id>` | Delete — alias: `delete` |

## Repository layout

This is a Turborepo monorepo (pnpm workspaces, Bun-first CLI):

```
apps/web            # Next.js landing page
packages/core       # storage engine: model, markdown (de)serialization, store resolution
packages/cli        # the `issu` binary
skills/             # public, user-facing skills (how to use the CLI)
.skills/            # internal, dev-only skills (how the system works)
```

### Development

```bash
pnpm install
pnpm dev            # run the landing page
pnpm cli -- init    # run the CLI from source
pnpm test           # run the test suite (Bun)
pnpm typecheck      # type-check every package
```

### Releasing

[`CHANGELOG.md`](./CHANGELOG.md) is the source of truth — you never pass a
version flag or pick patch/minor/major. To ship a release:

1. Move your staged notes from `## [Unreleased]` into a new dated section at the
   top of the changelog, e.g. `## [0.2.0] - 2026-09-01`.
2. Merge that to `main`.

On every push to `main`, the [release workflow](./.github/workflows/release.yml)
reads the top version from `CHANGELOG.md`. If that version isn't tagged yet, it
runs tests + typecheck, stamps the version into both packages, publishes
`@issu/core` then `issu` to npm, commits the version bump, and creates a matching
git tag + GitHub Release using the changelog notes. If the version is already
tagged, it does nothing. The only required secret is `NPM_TOKEN`.

## Built with v0

This project was built with [v0](https://v0.app). The repository is linked to a
v0 project — start new chats to make changes, and v0 will push commits directly
to this repo.

[Continue working on v0 →](https://v0.app/chat/projects/prj_TLL7oTfDIXCtH3qc8T9SPc6zk5Tz)
