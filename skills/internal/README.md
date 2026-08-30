# Internal skills (NOT user-exposed)

These skills describe **how issu works under the hood**. They are for people (and agents)
*working on* issu — not for end users. Do not ship, surface, or expose these to users of
the CLI.

## What belongs here

- Architecture, source layout, and module responsibilities
- Core invariants that must be preserved when changing code
- Development workflows (how to add a command, run tests, typecheck)
- Design rationale and internal roadmap (e.g. how GitHub sync / MCP will be built)

## What does NOT belong here

- How to *use* the CLI → `skills/public/`
- Anything intended for end users

## Rule of thumb

If it only matters to someone reading or changing issu's source, it's internal. If a plain
user of the tool would benefit, it belongs in `skills/public/`.

## Contents

- `issu-architecture/` — monorepo layout, core storage invariants, dev workflow, test strategy, roadmap.
