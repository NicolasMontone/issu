import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { findProjectStore, globalStoreDir, resolveStore } from "./paths.ts";

let dir: string;
const savedEnv = { ...process.env };

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "issu-paths-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  process.env = { ...savedEnv };
});

describe("globalStoreDir", () => {
  test("honors ISSU_HOME above everything", () => {
    process.env.ISSU_HOME = "/tmp/custom-issu";
    expect(globalStoreDir()).toBe(path.resolve("/tmp/custom-issu"));
  });

  test("falls back to XDG_CONFIG_HOME/issu when ISSU_HOME unset", () => {
    delete process.env.ISSU_HOME;
    process.env.XDG_CONFIG_HOME = "/tmp/xdg";
    expect(globalStoreDir()).toBe(path.join("/tmp/xdg", "issu"));
  });
});

describe("findProjectStore", () => {
  test("finds a .issu directory in the start dir", async () => {
    await mkdir(path.join(dir, ".issu"), { recursive: true });
    expect(findProjectStore(dir)).toBe(path.join(dir, ".issu"));
  });

  test("walks up the tree to find a parent .issu", async () => {
    await mkdir(path.join(dir, ".issu"), { recursive: true });
    const nested = path.join(dir, "a", "b", "c");
    await mkdir(nested, { recursive: true });
    expect(findProjectStore(nested)).toBe(path.join(dir, ".issu"));
  });

  test("returns null when no .issu exists up-tree", async () => {
    const nested = path.join(dir, "x", "y");
    await mkdir(nested, { recursive: true });
    expect(findProjectStore(nested)).toBeNull();
  });
});

describe("resolveStore", () => {
  test("defaults to global scope (the opinionated default)", () => {
    process.env.ISSU_HOME = path.join(dir, "global");
    const r = resolveStore({ cwd: dir });
    expect(r.scope).toBe("global");
    expect(r.dir).toBe(path.resolve(path.join(dir, "global")));
  });

  test("explicit dir always wins and is treated as project scope", () => {
    const r = resolveStore({ dir: path.join(dir, "explicit"), cwd: dir });
    expect(r.scope).toBe("project");
    expect(r.dir).toBe(path.resolve(path.join(dir, "explicit")));
  });

  test("project scope uses nearest existing .issu", async () => {
    await mkdir(path.join(dir, ".issu"), { recursive: true });
    const nested = path.join(dir, "deep");
    await mkdir(nested, { recursive: true });
    const r = resolveStore({ scope: "project", cwd: nested });
    expect(r.dir).toBe(path.join(dir, ".issu"));
  });

  test("project scope with no existing store defaults to <cwd>/.issu", () => {
    const r = resolveStore({ scope: "project", cwd: dir });
    expect(r.dir).toBe(path.join(path.resolve(dir), ".issu"));
  });
});
