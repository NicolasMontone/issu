# Changelog

All notable changes to **issu** are documented here. This file is the source of
truth for releases: to ship a version, add a `## [x.y.z] - DATE` section at the
top (below `Unreleased`). Merging that to `main` publishes it to npm.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Stage notes for the next release here. They won't publish until you
     move them under a real `## [x.y.z] - DATE` heading. -->

## [0.1.0] - 2026-08-29

### Added

- Initial release of the `issu` CLI and `@issu/core` storage engine.
- Markdown + YAML frontmatter issues, one file per issue.
- Global store by default (`~/.config/issu`) with opt-in per-project stores (`.issu/`).
- Commands: `init`, `create`, `ls`, `view`, `edit`, `start`, `done`, `reopen`, `cancel`, `rm`.
- Sub-issues via `--parent`, tree view, filtering, and free-text search.
- Safe frontmatter parsing (executable `---js` frontmatter is rejected).
