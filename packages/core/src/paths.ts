import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { StoreScope } from "./types.ts";

/** The directory name used for a project-local store. */
export const PROJECT_DIR_NAME = ".issu";

/**
 * The global store directory.
 * Honors ISSU_HOME, then XDG_CONFIG_HOME, then falls back to ~/.config/issu.
 */
export function globalStoreDir(): string {
  if (process.env.ISSU_HOME) return path.resolve(process.env.ISSU_HOME);
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ? path.resolve(xdg) : path.join(homedir(), ".config");
  return path.join(base, "issu");
}

/**
 * Walk up from `startDir` to the filesystem root looking for a `.issu` directory.
 * Returns the store path (…/.issu) if found, otherwise null.
 */
export function findProjectStore(startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, PROJECT_DIR_NAME);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export interface ResolveOptions {
  /** Force a scope. Omit to use the default resolution. */
  scope?: StoreScope;
  /** Explicit store directory; overrides everything else. */
  dir?: string;
  /** Where to start searching for a project store. Defaults to cwd. */
  cwd?: string;
}

export interface ResolvedStore {
  dir: string;
  scope: StoreScope;
}

/**
 * Resolve which store to use.
 *
 * Opinionated rule (per design): global is the default. Project is opt-in via
 * `scope: "project"` (or an explicit dir). When project scope is requested we
 * use the nearest existing `.issu`, or default to `<cwd>/.issu` if none exists.
 */
export function resolveStore(opts: ResolveOptions = {}): ResolvedStore {
  const cwd = opts.cwd ?? process.cwd();

  if (opts.dir) {
    return { dir: path.resolve(opts.dir), scope: "project" };
  }

  if (opts.scope === "project") {
    const found = findProjectStore(cwd);
    return { dir: found ?? path.join(path.resolve(cwd), PROJECT_DIR_NAME), scope: "project" };
  }

  return { dir: globalStoreDir(), scope: "global" };
}

export function issuesDir(storeDir: string): string {
  return path.join(storeDir, "issues");
}

export function configPath(storeDir: string): string {
  return path.join(storeDir, "config.json");
}

export function issuePath(storeDir: string, id: string): string {
  return path.join(issuesDir(storeDir), `${id}.md`);
}
