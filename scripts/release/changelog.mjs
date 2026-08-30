#!/usr/bin/env node
// Parses CHANGELOG.md (Keep a Changelog style) and reports the latest
// released version + its notes. The changelog is the SINGLE SOURCE OF TRUTH
// for releases: to ship, you add a `## [x.y.z] - DATE` section at the top.
//
// Usage:
//   node scripts/release/changelog.mjs version   -> prints "x.y.z"
//   node scripts/release/changelog.mjs notes      -> prints that version's notes
//
// An "## [Unreleased]" heading (case-insensitive) is skipped, so you can stage
// notes there without triggering a release until you stamp a real version.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOG = resolve(__dirname, "..", "..", "CHANGELOG.md");

// Matches:  ## [1.2.3] - 2026-08-29   /   ## 1.2.3   /   ## [1.2.3]
const HEADING = /^##\s+\[?(\d+\.\d+\.\d+)\]?/;

function parse() {
  const raw = readFileSync(CHANGELOG, "utf8");
  const lines = raw.split("\n");

  let version = null;
  const notes = [];
  let capturing = false;

  for (const line of lines) {
    const match = line.match(HEADING);
    if (match) {
      if (!capturing) {
        // First real version heading -> start capturing its notes.
        version = match[1];
        capturing = true;
        continue;
      }
      // Next version heading -> stop.
      break;
    }
    if (capturing) notes.push(line);
  }

  if (!version) {
    throw new Error(
      "No released version found in CHANGELOG.md. Add a `## [x.y.z] - DATE` section.",
    );
  }

  return { version, notes: notes.join("\n").trim() };
}

const command = process.argv[2] ?? "version";
const { version, notes } = parse();

if (command === "version") {
  process.stdout.write(version + "\n");
} else if (command === "notes") {
  process.stdout.write((notes || "Release " + version) + "\n");
} else {
  process.stderr.write(`Unknown command: ${command}\n`);
  process.exit(1);
}
