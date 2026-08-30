---
name: issu
description: >-
  Manage and organize development tasks with the `issu` CLI — a local,
  opinionated task tracker (a Linear you own, backed by plain markdown files
  on disk). Use whenever the user wants to plan work, break a feature into
  issues, track status, or review what's in progress with issu. Covers issue
  creation, sub-issue hierarchies, status/priority conventions, filtering, and
  the global-vs-project store model.
---

# issu — organizing tasks with the local CLI

`issu` is a local-first task tracker. Every issue is a markdown file with YAML
frontmatter, stored either in a **global** store (`~/.config/issu`, the default)
or a **project** store (`.issu/` inside a repo). Because the store is plain
text, it is git-syncable by design — the eventual "push to GitHub" flow is just
committing those files.

This skill is about *how to drive issu well*, not just its flags. Treat it like
a lightweight Linear workflow.

## Core mental model

- **One issue = one unit of work** that a person could pick up and finish. If a
  task needs more than a sentence of "and also…", it is probably several issues.
- **Hierarchy via `--parent`.** A large piece of work becomes a parent issue
  with sub-issues. Keep hierarchy shallow (parent → children). Don't nest deeply.
- **Status is a workflow, not a label:** `backlog` → `todo` → `in_progress` →
  `done` (or `canceled`). Only one or two things should be `in_progress` at once.
- **Priority mirrors Linear:** `urgent`, `high`, `medium`, `low`, `none`.
  Reserve `urgent` for "drop everything." Most issues are `medium` or `none`.
- **Labels are cross-cutting facets** (`bug`, `auth`, `perf`, `chore`). Use a
  small, consistent vocabulary rather than inventing a new label per issue.

## The workflow for breaking down a feature

When the user describes a feature or project, don't dump a flat list. Do this:

1. **Pick the store.** Feature work tied to a repo → `--project`. Personal /
   cross-repo tasks → global (default). If unsure, ask which they want.
2. **Create a parent issue** capturing the outcome (the "why"), with a real
   description in the body.
3. **Create sub-issues** for each shippable step, each linked with
   `--parent <id>`. Give them priorities that reflect sequencing.
4. **Show the tree** with `issu ls --tree` so the user can sanity-check the plan
   before any code is written.
5. As work happens, move issues with `issu start <id>` / `issu done <id>` rather
   than editing status by hand — it reads better and keeps intent clear.

Prefer imperative, specific titles: "Add rate limiting to /api/login", not
"login stuff".

## Command reference

Scope flags apply to **every** command: `--global` (default), `--project`
(nearest `.issu/`, or create one in cwd), or `--dir <path>` for an explicit
store. Add `--json` anywhere for machine-readable output.

### Set up a store
```bash
issu init                          # global store
issu init --project --prefix WEB   # repo-local store, ids like WEB-1
issu init --name "Web app"         # give the workspace a name
```

### Create issues
```bash
issu create "Fix login redirect"
issu create "Fix login redirect" -p urgent -l bug -l auth -d "Users bounce to / after login."
issu create "Write regression test" --parent WEB-1 -p high
```
Options: `-d/--desc`, `-s/--status`, `-p/--priority` (name or 0–4),
`-l/--label` (repeatable), `-a/--assignee`, `--parent <id>`.
Aliases: `add`, `new`.

### List and inspect
```bash
issu ls                     # open issues (hides done/canceled)
issu ls --all               # include done + canceled
issu ls --tree              # show parent/sub-issue hierarchy
issu ls -s in_progress      # filter by status
issu ls -l bug -p urgent    # filter by label + priority
issu ls -q "redirect"       # free-text search over id/title/description
issu view WEB-1             # full detail, including sub-issues
```
Aliases: `list` for `ls`, `show` for `view`.

### Update and transition
```bash
issu edit WEB-1 --title "Fix post-login redirect" -p high -a matt -l bug
issu start WEB-1            # -> in_progress
issu done WEB-1            # -> done
issu reopen WEB-1          # -> todo
issu cancel WEB-1          # -> canceled
issu rm WEB-1              # delete (alias: delete)
```
`edit` accepts the same field flags as `create`. Alias: `update`.

## Conventions to enforce

- **Keep `in_progress` small.** If the user starts a new issue while several are
  already in progress, gently point it out.
- **Every non-trivial issue gets a description.** The title is the "what"; the
  body is the "why / acceptance criteria."
- **Sub-issues over mega-issues.** If a `done` would require several unrelated
  changes, split it first.
- **Use `--tree` when reporting status** so hierarchy and blockers are visible.
- **The markdown files are the source of truth.** They can be read, hand-edited,
  and committed to git. When syncing to GitHub later, it's these files that move.

## Store layout (for reference)

```
<store>/
  config.json          # prefix, counter, workspace name
  issues/
    WEB-1.md           # frontmatter (status, priority, labels, parent…) + body
    WEB-2.md
```
