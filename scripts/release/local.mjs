#!/usr/bin/env node
// Local release helper. Mirrors .github/workflows/release.yml so you can publish
// from your own machine (with your own `npm login`) instead of via CI.
//
// Usage:
//   node scripts/release/local.mjs            # publish for real
//   node scripts/release/local.mjs --dry-run  # pack + show, upload nothing
//
// Steps: read version from CHANGELOG.md -> tests + typecheck -> build ->
// stamp version into both packages -> publish @issu/core then issu.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const dryRun = process.argv.includes("--dry-run");

const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
};

// 1. Resolve the version to publish from the changelog (single source of truth).
const version = execSync("node scripts/release/changelog.mjs version", {
  cwd: root,
})
  .toString()
  .trim();

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`Could not read a valid version from CHANGELOG.md (got "${version}").`);
  process.exit(1);
}
console.log(`Releasing issu v${version}${dryRun ? " (dry-run)" : ""}`);

// 2. Confirm you are logged in to npm before doing any work (real runs only).
if (!dryRun) {
  try {
    const who = execSync("npm whoami", { cwd: root }).toString().trim();
    console.log(`npm user: ${who}`);
  } catch {
    console.error("Not logged in to npm. Run `npm login` first.");
    process.exit(1);
  }
}

// 3. Quality gates — same as CI.
run("pnpm test");
run("pnpm typecheck");

// 4. Build the publishable dist/ output for both packages.
run("pnpm --filter @issu/core --filter issu build");

// 5. Stamp the changelog version into both package.json files.
run(`npm version ${version} --no-git-tag-version --allow-same-version`, {
  cwd: resolve(root, "packages/core"),
});
run(`npm version ${version} --no-git-tag-version --allow-same-version`, {
  cwd: resolve(root, "packages/cli"),
});

// 6. Publish core first (library), then the self-contained CLI.
const publishFlags = `--access public --no-git-checks${dryRun ? " --dry-run" : ""}`;
run(`pnpm --filter @issu/core publish ${publishFlags}`);
run(`pnpm --filter issu publish ${publishFlags}`);

console.log(
  dryRun
    ? `\nDry-run complete. Nothing was uploaded.`
    : `\nPublished issu v${version}. Don't forget to commit the version bump and tag:\n  git commit -am "chore(release): v${version}"\n  git tag v${version} && git push --follow-tags`,
);
