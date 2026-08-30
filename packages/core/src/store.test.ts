import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { IssueStore } from "./store.ts";
import { configPath, issuePath } from "./paths.ts";

let dir: string;
let store: IssueStore;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "issu-test-"));
  store = new IssueStore({ dir, scope: "project" });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("init", () => {
  test("creates config with uppercased prefix and zeroed counter", async () => {
    const config = await store.init({ prefix: "web", name: "Web app" });
    expect(config.prefix).toBe("WEB");
    expect(config.counter).toBe(0);
    expect(config.name).toBe("Web app");
    expect(store.exists()).toBe(true);
  });

  test("defaults prefix to ISS", async () => {
    const config = await store.init();
    expect(config.prefix).toBe("ISS");
  });

  test("is idempotent — second init returns existing config, does not reset counter", async () => {
    await store.init({ prefix: "WEB" });
    await store.create({ title: "one" });
    const config = await store.init({ prefix: "OTHER" });
    expect(config.prefix).toBe("WEB");
    expect(config.counter).toBe(1);
  });

  test("writes config.json to the store dir", async () => {
    await store.init({ prefix: "WEB" });
    const raw = await readFile(configPath(dir), "utf8");
    expect(JSON.parse(raw).prefix).toBe("WEB");
  });
});

describe("create + id generation", () => {
  beforeEach(async () => {
    await store.init({ prefix: "WEB" });
  });

  test("generates sequential prefixed ids", async () => {
    const a = await store.create({ title: "first" });
    const b = await store.create({ title: "second" });
    const c = await store.create({ title: "third" });
    expect(a.id).toBe("WEB-1");
    expect(b.id).toBe("WEB-2");
    expect(c.id).toBe("WEB-3");
  });

  test("applies defaults for omitted fields", async () => {
    const issue = await store.create({ title: "bare" });
    expect(issue.status).toBe("backlog");
    expect(issue.priority).toBe(0);
    expect(issue.labels).toEqual([]);
    expect(issue.assignee).toBeNull();
    expect(issue.parent).toBeNull();
    expect(issue.created).toBe(issue.updated);
  });

  test("persists all provided fields", async () => {
    const issue = await store.create({
      title: "Fix login",
      description: "bounce to /",
      status: "in_progress",
      priority: 1,
      labels: ["bug", "auth"],
      assignee: "matt",
    });
    expect(issue.title).toBe("Fix login");
    expect(issue.description).toBe("bounce to /");
    expect(issue.status).toBe("in_progress");
    expect(issue.priority).toBe(1);
    expect(issue.labels).toEqual(["bug", "auth"]);
    expect(issue.assignee).toBe("matt");
  });

  test("writes a .md file at the id path", async () => {
    await store.create({ title: "on disk" });
    const raw = await readFile(issuePath(dir, "WEB-1"), "utf8");
    expect(raw).toContain("id: WEB-1");
    expect(raw).toContain("title: on disk");
  });
});

describe("markdown round-trip", () => {
  beforeEach(async () => {
    await store.init({ prefix: "WEB" });
  });

  test("get() returns an issue equal to what create() wrote", async () => {
    const created = await store.create({
      title: "Round trip",
      description: "line one\n\nline two",
      priority: 2,
      labels: ["x", "y"],
      assignee: "sam",
    });
    const loaded = await store.get(created.id);
    expect(loaded).toEqual(created);
  });

  test("frontmatter is written in a stable key order for clean diffs", async () => {
    await store.create({ title: "order" });
    const raw = await readFile(issuePath(dir, "WEB-1"), "utf8");
    const frontmatter = raw.split("---")[1] ?? "";
    const keys = frontmatter
      .trim()
      .split("\n")
      .map((l) => (l.split(":")[0] ?? "").trim());
    expect(keys).toEqual([
      "id",
      "title",
      "status",
      "priority",
      "labels",
      "assignee",
      "parent",
      "created",
      "updated",
    ]);
  });

  test("deserialize falls back gracefully on a malformed status/priority", async () => {
    await store.init({ prefix: "WEB" });
    await Bun.write(
      issuePath(dir, "WEB-9"),
      "---\nid: WEB-9\ntitle: bad\nstatus: nonsense\npriority: 42\n---\n\nbody\n",
    );
    const loaded = await store.get("WEB-9");
    expect(loaded?.status).toBe("backlog");
    expect(loaded?.priority).toBe(0);
    expect(loaded?.title).toBe("bad");
  });

  test("rejects executable `---js` frontmatter instead of running it", async () => {
    await store.init({ prefix: "WEB" });
    // A malicious/synced file that would run code under gray-matter's default
    // engines. Our locked engines must throw rather than eval this.
    let executed = false;
    (globalThis as Record<string, unknown>).__issu_pwned = () => {
      executed = true;
    };
    await Bun.write(
      issuePath(dir, "WEB-9"),
      "---js\nglobalThis.__issu_pwned();\nmodule.exports = { title: 'pwned' };\n---\n\nbody\n",
    );
    await expect(store.get("WEB-9")).rejects.toThrow(/JavaScript frontmatter/);
    expect(executed).toBe(false);
    delete (globalThis as Record<string, unknown>).__issu_pwned;
  });
});

describe("get", () => {
  beforeEach(async () => {
    await store.init({ prefix: "WEB" });
  });

  test("returns null for a missing issue", async () => {
    expect(await store.get("WEB-999")).toBeNull();
  });
});

describe("update", () => {
  beforeEach(async () => {
    await store.init({ prefix: "WEB" });
  });

  test("patches fields and bumps updated but not created", async () => {
    const created = await store.create({ title: "before" });
    await Bun.sleep(2);
    const updated = await store.update(created.id, { title: "after", status: "done" });
    expect(updated.title).toBe("after");
    expect(updated.status).toBe("done");
    expect(updated.created).toBe(created.created);
    expect(updated.updated >= created.updated).toBe(true);
  });

  test("cannot overwrite id or created via patch", async () => {
    const created = await store.create({ title: "immutable" });
    const updated = await store.update(created.id, {
      // @ts-expect-error intentionally passing disallowed fields
      id: "HACK-1",
      created: "1999-01-01T00:00:00.000Z",
      title: "ok",
    });
    expect(updated.id).toBe(created.id);
    expect(updated.created).toBe(created.created);
  });

  test("throws for a missing issue", async () => {
    expect(store.update("WEB-999", { title: "x" })).rejects.toThrow("not found");
  });
});

describe("remove", () => {
  beforeEach(async () => {
    await store.init({ prefix: "WEB" });
  });

  test("deletes the issue file", async () => {
    const created = await store.create({ title: "temp" });
    await store.remove(created.id);
    expect(await store.get(created.id)).toBeNull();
  });

  test("throws for a missing issue", async () => {
    expect(store.remove("WEB-999")).rejects.toThrow("not found");
  });
});

describe("list — filtering and sorting", () => {
  beforeEach(async () => {
    await store.init({ prefix: "WEB" });
    await store.create({ title: "urgent bug", priority: 1, labels: ["bug"], status: "todo" });
    await store.create({ title: "low chore", priority: 4, labels: ["chore"], assignee: "matt" });
    await store.create({ title: "no priority", priority: 0, status: "done" });
    await store.create({ title: "high feature", priority: 2, status: "in_progress" });
  });

  test("returns all issues by default", async () => {
    expect((await store.list()).length).toBe(4);
  });

  test("sorts urgent→low with none last", async () => {
    const ids = (await store.list()).map((i) => i.priority);
    expect(ids).toEqual([1, 2, 4, 0]);
  });

  test("filters by single status", async () => {
    const r = await store.list({ status: "done" });
    expect(r.map((i) => i.title)).toEqual(["no priority"]);
  });

  test("filters by multiple statuses", async () => {
    const r = await store.list({ status: ["todo", "in_progress"] });
    expect(r.length).toBe(2);
  });

  test("filters by priority", async () => {
    const r = await store.list({ priority: 1 });
    expect(r.map((i) => i.title)).toEqual(["urgent bug"]);
  });

  test("filters by label", async () => {
    const r = await store.list({ label: "bug" });
    expect(r.map((i) => i.title)).toEqual(["urgent bug"]);
  });

  test("filters by assignee", async () => {
    const r = await store.list({ assignee: "matt" });
    expect(r.map((i) => i.title)).toEqual(["low chore"]);
  });

  test("free-text query matches title case-insensitively", async () => {
    const r = await store.list({ query: "FEATURE" });
    expect(r.map((i) => i.title)).toEqual(["high feature"]);
  });
});

describe("hierarchy", () => {
  beforeEach(async () => {
    await store.init({ prefix: "WEB" });
  });

  test("children() returns issues whose parent matches", async () => {
    const parent = await store.create({ title: "epic" });
    await store.create({ title: "sub a", parent: parent.id });
    await store.create({ title: "sub b", parent: parent.id });
    await store.create({ title: "unrelated" });
    const kids = await store.children(parent.id);
    expect(kids.map((i) => i.title).sort()).toEqual(["sub a", "sub b"]);
  });

  test("top-level issues have parent === null and can be filtered", async () => {
    const parent = await store.create({ title: "epic" });
    await store.create({ title: "child", parent: parent.id });
    const roots = await store.list({ parent: null });
    expect(roots.map((i) => i.title)).toEqual(["epic"]);
  });
});

describe("uninitialized store", () => {
  test("list throws a helpful error before init", async () => {
    const fresh = new IssueStore({ dir: path.join(dir, "nope"), scope: "project" });
    expect(fresh.list()).rejects.toThrow("No issu store found");
  });
});
