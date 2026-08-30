import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ENTRY = path.join(import.meta.dir, "index.ts");

let home: string;

/** Run the issu CLI as a subprocess against an isolated global store (ISSU_HOME). */
async function issu(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", ENTRY, ...args], {
    env: { ...process.env, ISSU_HOME: home, NO_COLOR: "1" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

beforeEach(async () => {
  home = await mkdtemp(path.join(tmpdir(), "issu-cli-"));
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

describe("cli end-to-end", () => {
  test("full lifecycle: init → create → ls → transition → view", async () => {
    const init = await issu("init", "--prefix", "WEB", "--name", "Web app");
    expect(init.code).toBe(0);

    const create = await issu(
      "create",
      "Fix login redirect",
      "-p",
      "urgent",
      "-l",
      "bug",
      "-l",
      "auth",
      "-d",
      "bounce to /",
    );
    expect(create.code).toBe(0);
    expect(create.stdout).toContain("WEB-1");

    const child = await issu("create", "Write test", "--parent", "WEB-1", "-p", "high");
    expect(child.code).toBe(0);
    expect(child.stdout).toContain("WEB-2");

    const ls = await issu("ls");
    expect(ls.stdout).toContain("WEB-1");
    expect(ls.stdout).toContain("Fix login redirect");

    // done should hide it from the default (open) list.
    // (Assert on the title, not the id: the child WEB-2 row still shows a
    // "↳ WEB-1" parent reference, so the raw id legitimately remains.)
    const done = await issu("done", "WEB-1");
    expect(done.code).toBe(0);
    const lsAfter = await issu("ls");
    expect(lsAfter.stdout).not.toContain("Fix login redirect");

    // but --all shows it
    const all = await issu("ls", "--all");
    expect(all.stdout).toContain("WEB-1");

    const view = await issu("view", "WEB-1");
    expect(view.stdout).toContain("Fix login redirect");
    expect(view.stdout).toContain("done");
  });

  test("ls --json emits valid JSON", async () => {
    await issu("init", "--prefix", "API");
    await issu("create", "task one");
    const res = await issu("ls", "--json");
    expect(res.code).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe("task one");
    expect(parsed[0].id).toBe("API-1");
  });

  test("priority accepts named values via edit", async () => {
    await issu("init", "--prefix", "WEB");
    await issu("create", "task");
    const edit = await issu("edit", "WEB-1", "-p", "medium");
    expect(edit.code).toBe(0);
    const res = await issu("ls", "--json");
    expect(JSON.parse(res.stdout)[0].priority).toBe(3);
  });

  test("invalid priority exits non-zero with a helpful message", async () => {
    await issu("init", "--prefix", "WEB");
    const res = await issu("create", "task", "-p", "banana");
    expect(res.code).not.toBe(0);
    expect(res.stderr.toLowerCase()).toContain("invalid priority");
  });

  test("operating on an uninitialized store fails helpfully", async () => {
    const res = await issu("ls");
    expect(res.code).not.toBe(0);
    expect(res.stderr).toContain("issu init");
  });

  test("help output lists the primary commands", async () => {
    const res = await issu("help");
    expect(res.stdout).toContain("create");
    expect(res.stdout).toContain("ls");
    expect(res.stdout).toContain("done");
  });
});
