import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import {
  configPath,
  issuePath,
  issuesDir,
  resolveStore,
  type ResolveOptions,
  type ResolvedStore,
} from "./paths.ts";
import {
  PRIORITIES,
  STATUSES,
  type CreateIssueInput,
  type Issue,
  type IssueFrontmatter,
  type ListFilter,
  type Priority,
  type Status,
  type StoreConfig,
  type UpdateIssueInput,
} from "./types.ts";

const CONFIG_VERSION = 1;
const DEFAULT_PREFIX = "ISS";

function nowISO(): string {
  return new Date().toISOString();
}

/** Build the frontmatter object in a stable key order for clean, deterministic diffs. */
function toFrontmatter(issue: Issue): IssueFrontmatter {
  return {
    id: issue.id,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    labels: issue.labels,
    assignee: issue.assignee,
    parent: issue.parent,
    created: issue.created,
    updated: issue.updated,
  };
}

function serialize(issue: Issue): string {
  const fm = toFrontmatter(issue);
  // gray-matter preserves object key order when dumping YAML.
  return matter.stringify(issue.description ? `\n${issue.description}\n` : "\n", fm as Record<string, unknown>);
}

function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

function isPriority(v: unknown): v is Priority {
  return typeof v === "number" && (PRIORITIES as readonly number[]).includes(v);
}

function deserialize(raw: string, fallbackId: string): Issue {
  const { data, content } = matter(raw);
  const d = data as Record<string, unknown>;
  return {
    id: typeof d.id === "string" ? d.id : fallbackId,
    title: typeof d.title === "string" ? d.title : "(untitled)",
    description: content.trim(),
    status: isStatus(d.status) ? d.status : "backlog",
    priority: isPriority(d.priority) ? d.priority : 0,
    labels: Array.isArray(d.labels) ? d.labels.map(String) : [],
    assignee: typeof d.assignee === "string" ? d.assignee : null,
    parent: typeof d.parent === "string" ? d.parent : null,
    created: typeof d.created === "string" ? d.created : nowISO(),
    updated: typeof d.updated === "string" ? d.updated : nowISO(),
  };
}

export class IssueStore {
  readonly dir: string;
  readonly scope: ResolvedStore["scope"];

  constructor(resolved: ResolvedStore) {
    this.dir = resolved.dir;
    this.scope = resolved.scope;
  }

  /** Resolve and construct a store without touching disk. */
  static resolve(opts?: ResolveOptions): IssueStore {
    return new IssueStore(resolveStore(opts));
  }

  /** Whether this store has been initialized (config.json exists). */
  exists(): boolean {
    return existsSync(configPath(this.dir));
  }

  /** Create the store directory + default config if missing. Idempotent. */
  async init(opts: { prefix?: string; name?: string } = {}): Promise<StoreConfig> {
    await mkdir(issuesDir(this.dir), { recursive: true });
    if (this.exists()) return this.readConfig();
    const config: StoreConfig = {
      version: CONFIG_VERSION,
      prefix: (opts.prefix ?? DEFAULT_PREFIX).toUpperCase(),
      counter: 0,
      name: opts.name,
    };
    await this.writeConfig(config);
    return config;
  }

  private async ensureReady(): Promise<void> {
    if (!this.exists()) {
      throw new Error(
        `No issu store found at ${this.dir}. Run "issu init" first (add --project for a project store).`,
      );
    }
  }

  async readConfig(): Promise<StoreConfig> {
    const raw = await readFile(configPath(this.dir), "utf8");
    return JSON.parse(raw) as StoreConfig;
  }

  private async writeConfig(config: StoreConfig): Promise<void> {
    await writeFile(configPath(this.dir), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }

  private async nextId(): Promise<string> {
    const config = await this.readConfig();
    config.counter += 1;
    await this.writeConfig(config);
    return `${config.prefix}-${config.counter}`;
  }

  async list(filter: ListFilter = {}): Promise<Issue[]> {
    await this.ensureReady();
    const dir = issuesDir(this.dir);
    if (!existsSync(dir)) return [];
    const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    const issues = await Promise.all(
      files.map(async (f) => {
        const raw = await readFile(issuePath(this.dir, f.slice(0, -3)), "utf8");
        return deserialize(raw, f.slice(0, -3));
      }),
    );
    return issues.filter((i) => matchesFilter(i, filter)).sort(byPriorityThenCreated);
  }

  async get(id: string): Promise<Issue | null> {
    await this.ensureReady();
    const p = issuePath(this.dir, id);
    if (!existsSync(p)) return null;
    return deserialize(await readFile(p, "utf8"), id);
  }

  async create(input: CreateIssueInput): Promise<Issue> {
    await this.ensureReady();
    const id = await this.nextId();
    const ts = nowISO();
    const issue: Issue = {
      id,
      title: input.title,
      description: input.description?.trim() ?? "",
      status: input.status ?? "backlog",
      priority: input.priority ?? 0,
      labels: input.labels ?? [],
      assignee: input.assignee ?? null,
      parent: input.parent ?? null,
      created: ts,
      updated: ts,
    };
    await writeFile(issuePath(this.dir, id), serialize(issue), "utf8");
    return issue;
  }

  async update(id: string, patch: UpdateIssueInput): Promise<Issue> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Issue ${id} not found.`);
    const updated: Issue = {
      ...existing,
      ...patch,
      // never allow id/created to be overwritten via patch
      id: existing.id,
      created: existing.created,
      updated: nowISO(),
    };
    await writeFile(issuePath(this.dir, id), serialize(updated), "utf8");
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.ensureReady();
    const p = issuePath(this.dir, id);
    if (!existsSync(p)) throw new Error(`Issue ${id} not found.`);
    await rm(p);
  }

  /** Direct children of a given issue id. */
  async children(id: string): Promise<Issue[]> {
    return this.list({ parent: id });
  }
}

function matchesFilter(issue: Issue, filter: ListFilter): boolean {
  if (filter.status) {
    const set = Array.isArray(filter.status) ? filter.status : [filter.status];
    if (!set.includes(issue.status)) return false;
  }
  if (filter.priority !== undefined) {
    const set = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
    if (!set.includes(issue.priority)) return false;
  }
  if (filter.label && !issue.labels.includes(filter.label)) return false;
  if (filter.assignee && issue.assignee !== filter.assignee) return false;
  if (filter.parent !== undefined && issue.parent !== filter.parent) return false;
  if (filter.query) {
    const q = filter.query.toLowerCase();
    const hay = `${issue.id} ${issue.title} ${issue.description}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function byPriorityThenCreated(a: Issue, b: Issue): number {
  // urgent(1) first, then high..low, with none(0) last.
  const rank = (p: Priority) => (p === 0 ? 99 : p);
  const pr = rank(a.priority) - rank(b.priority);
  if (pr !== 0) return pr;
  return a.created.localeCompare(b.created);
}
