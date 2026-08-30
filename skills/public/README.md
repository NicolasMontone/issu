# Public skills (user-exposed)

These skills are **shipped with issu and safe to surface to end users**. They document
*how to use the CLI* — commands, flags, workflows, conventions — from the perspective of
someone driving `issu`, whether that's a human or an assistant acting on their behalf.

## What belongs here

- How to run commands (`issu create`, `issu ls`, `issu done`, ...)
- Task-organization workflows (breaking work down, hierarchy, status/priority conventions)
- Anything a user or their agent needs to operate the tool effectively

## What does NOT belong here

- Internal architecture, source layout, or invariants → `skills/internal/`
- How the storage engine is implemented, how sync will work under the hood, dev workflows

## Rule of thumb

If a person who only ever *uses* issu (and never opens its source) would benefit from it,
it's public. If it only matters to someone *working on* issu, it's internal.

## Contents

- `issu/` — using the issu CLI to manage and organize tasks.
