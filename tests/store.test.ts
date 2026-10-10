import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store, estimateTokens, cosine } from "../src/main/store.js";
import { parseImport, redact, proposals } from "../src/main/importer.js";
import type { MemoryInput } from "../src/shared/types.js";
let store: Store, folder: string, id: string;
const input = (extra: Partial<MemoryInput> = {}): MemoryInput => ({
  title: "Authentication tokens",
  content:
    "Expired authentication tokens cause API errors. Refresh the token before retrying.",
  type: "Debugging Lesson",
  status: "Proposed",
  source: "Synthetic test",
  tags: ["auth"],
  ...extra,
});
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "mnemo-test-"));
  store = new Store(join(folder, "test.db"));
  id = store.addWorkspace(folder, "Synthetic").id;
});
afterEach(() => {
  store.close();
  rmSync(folder, { recursive: true, force: true });
});
describe("persistence and migrations", () => {
  it("reopens data and runs migrations idempotently", () => {
    const m = store.saveMemory(id, input());
    store.close();
    store = new Store(join(folder, "test.db"));
    expect(store.memory(id, m.id).content).toContain("Expired");
    expect(
      store.get<{ version: number }>("SELECT version FROM schema_versions")
        ?.version,
    ).toBe(1);
  });
  it("supports the Drizzle query adapter", async () => {
    store.saveMemory(id, input());
    expect((await store.listMemories(id))[0].title).toBe(
      "Authentication tokens",
    );
  });
  it("rolls back nested writes atomically", () => {
    expect(() =>
      store.transaction(() => {
        store.saveMemory(id, input());
        throw new Error("rollback");
      }),
    ).toThrow("rollback");
    expect(store.memories(id)).toHaveLength(0);
  });
  it("isolates workspaces and rejects cross-workspace relationships", () => {
    const a = store.saveMemory(id, input()),
      other = store.addWorkspace(folder + "-other", "Other").id,
      b = store.saveMemory(other, input());
    expect(() => store.memory(other, a.id)).toThrow();
    expect(() => store.link(id, a.id, b.id, "contradicts")).toThrow();
    expect(
      store.retrieve(other, "tokens").hits.map((h) => h.memory.id),
    ).toEqual([b.id]);
  });
  it("deletes derived records and sensitive settings", () => {
    store.saveMemory(id, input());
    store.setSetting(`credential:${id}`, "cipher");
    store.deleteWorkspace(id);
    expect(store.workspaces()).toHaveLength(0);
    expect(store.all("SELECT * FROM revisions")).toHaveLength(0);
    expect(store.setting(`credential:${id}`, null)).toBeNull();
  });
});
describe("imports", () => {
  const text = JSON.stringify({
    id: "s1",
    title: "Token issue",
    messages: [
      {
        role: "user",
        content: "The API failed because the authentication token expired.",
      },
    ],
  });
  it("previews standard JSON and imports duplicates once", () => {
    const parsed = parseImport(text, "test.json");
    expect(parsed.sessions[0].messages).toHaveLength(1);
    expect(
      store.importSessions(id, parsed.sessions, "test.json").imported,
    ).toBe(1);
    expect(
      store.importSessions(id, parsed.sessions, "test.json").duplicates,
    ).toBe(1);
  });
  it("indexes appended messages only and preserves old evidence", () => {
    const parsed = parseImport(text, "test.json").sessions;
    store.importSessions(id, parsed, "test.json");
    parsed[0].messages.push({
      role: "assistant",
      content: "Refresh the token.",
    });
    expect(store.importSessions(id, parsed, "test.json").updated).toBe(1);
    expect(store.sessions(id)[0].messageCount).toBe(2);
    parsed[0].messages[0].content = "Changed";
    expect(() => store.importSessions(id, parsed, "test.json")).toThrow(
      "changed existing messages",
    );
    expect(
      store.session(id, store.sessions(id)[0].id).messages?.[0].content,
    ).toContain("expired");
  });
  it("parses Claude export v1 and rejects unknown format", () => {
    expect(
      parseImport(
        JSON.stringify([
          {
            uuid: "c1",
            name: "Claude",
            created_at: "2026-01-01",
            chat_messages: [
              { sender: "human", text: "A synthetic conversation" },
            ],
          },
        ]),
        "claude.json",
      ).sessions[0].provider,
    ).toBe("claude-export-v1");
    expect(() => parseImport('{"garbage":true}', "bad.json")).toThrow(
      "unsupported schema",
    );
    expect(() => parseImport("{", "bad.json")).toThrow("Invalid JSON");
  });
  it("parses markdown/plain text and blocks unsupported files", () => {
    expect(
      parseImport("User: hi\nAssistant: hello", "test.md").sessions[0].messages,
    ).toHaveLength(2);
    expect(() => parseImport("hello", "test.exe")).toThrow("Supported imports");
    expect(() => parseImport("", "test.txt")).toThrow("empty");
  });
  it("redacts known secret patterns", () => {
    const result = redact(
      "api_key=abcdefg password:abc sk-abcdefghijklmnopqrstuvwx",
    );
    expect(result.count).toBe(3);
    expect(result.text).not.toContain("abcdefghijkl");
    expect(result.text).toContain("[REDACTED]");
  });
  it("imports nothing on one invalid session", () => {
    expect(() =>
      parseImport(
        JSON.stringify([
          { messages: [{ role: "user", content: "ok" }] },
          { messages: [] },
        ]),
        "bad.json",
      ),
    ).toThrow();
    expect(store.sessions(id)).toHaveLength(0);
  });
});
describe("memory lifecycle", () => {
  it("extracts proposals once with exact message provenance", () => {
    const parsed = parseImport(
      "User: The API failed because the authentication token expired.",
      "s.txt",
    );
    store.importSessions(id, parsed.sessions, "s.txt");
    const s = store.sessions(id)[0];
    expect(store.extract(id, s.id).proposed).toBe(1);
    expect(store.extract(id, s.id).proposed).toBe(0);
    const m = store.memories(id)[0];
    expect(m.status).toBe("Proposed");
    expect(m.source).toBe(`session:${s.id}#message:0`);
    expect(store.relationships(id).some((r) => r.kind === "derived from")).toBe(
      true,
    );
  });
  it("ignores conversational noise", () => {
    expect(
      proposals([{ role: "user", content: "Thanks, that looks nice." }]),
    ).toHaveLength(0);
  });
  it("tracks approval and version snapshots", () => {
    const m = store.saveMemory(id, input());
    expect(m.verifiedAt).toBeNull();
    const confirmed = store.saveMemory(id, { ...m, status: "Confirmed" });
    expect(confirmed.version).toBe(2);
    expect(confirmed.verifiedAt).not.toBeNull();
    expect(JSON.parse(store.revisions(id, m.id)[0].snapshot).status).toBe(
      "Proposed",
    );
  });
  it("archives memories and updates FTS after edits", () => {
    const m = store.saveMemory(id, input());
    store.saveMemory(id, {
      ...m,
      content: "Zebra migration constraints",
      title: "Zebra",
      tags: [],
    });
    expect(store.retrieve(id, "zebra").hits).toHaveLength(1);
    store.saveMemory(id, { ...store.memory(id, m.id), status: "Archived" });
    expect(store.retrieve(id, "zebra").hits).toHaveLength(0);
  });
  it("exports sources and revisions faithfully", () => {
    const m = store.saveMemory(id, input());
    store.saveMemory(id, { ...m, status: "Confirmed" });
    const exported = store.exportWorkspace(id);
    expect(exported.format).toBe("mnemo.workspace");
    expect(exported.memories[0].source).toBe("Synthetic test");
    expect(exported.revisions).toHaveLength(1);
  });
});
describe("context and evidence", () => {
  it("prioritizes confirmed knowledge and obeys budget", () => {
    store.saveMemory(id, input());
    const confirmed = store.saveMemory(
      id,
      input({
        title: "Verified authentication solution",
        status: "Confirmed",
        content: "Refresh expired authentication tokens.",
      }),
    );
    const bundle = store.retrieve(id, "authentication", 200);
    expect(bundle.hits[0].memory.id).toBe(confirmed.id);
    expect(bundle.tokens).toBeLessThanOrEqual(200);
    expect(bundle.text).toContain("source");
  });
  it("deduplicates repeated context and excludes requested records", () => {
    const a = store.saveMemory(id, input()),
      b = store.saveMemory(id, input({ title: "Duplicate" }));
    expect(store.retrieve(id, "tokens").hits).toHaveLength(1);
    expect(
      store.retrieve(id, "tokens", 2000, [], [a.id, b.id]).hits,
    ).toHaveLength(0);
  });
  it("surfaces explicit stored contradictions", () => {
    const a = store.saveMemory(id, input()),
      b = store.saveMemory(
        id,
        input({
          content:
            "Authentication tokens must never be refreshed automatically.",
        }),
      );
    store.link(id, a.id, b.id, "contradicts");
    const bundle = store.retrieve(id, "authentication");
    expect(bundle.conflicts).toHaveLength(1);
    expect(bundle.text).toContain("WARNING");
  });
  it("can retrieve cached semantic evidence and manual pins", () => {
    const m = store.saveMemory(
      id,
      input({
        title: "Connection timeout",
        content: "A timeout is resolved by checking socket connectivity.",
      }),
    );
    store.run(
      "INSERT INTO embeddings VALUES(?,?,?,?)",
      m.id,
      "test",
      "hash",
      JSON.stringify([1, 0, 0]),
    );
    expect(
      store
        .retrieve(id, "unmatched", 2000, [], [], [1, 0, 0], "test")
        .hits[0].reasons.some((r) => r.startsWith("Semantic")),
    ).toBe(true);
    expect(store.retrieve(id, "", 2000, [m.id]).hits).toHaveLength(1);
  });
  it("returns no fabricated context and rejects invalid budgets", () => {
    expect(store.retrieve(id, "nothing").hits).toHaveLength(0);
    expect(() => store.retrieve(id, "", 1)).toThrow();
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("😀")).toBe(1);
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([0, 0], [0, 0])).toBe(0);
  });
  it("requires evidence for executed/verified task states", () => {
    const task = {
      objective: "Run tests",
      requirements: "",
      environment: "Test",
      status: "Verified",
      evidence: "",
      blockers: "",
    };
    expect(() => store.saveTask(id, task)).toThrow("evidence");
    expect(
      store.saveTask(id, { ...task, evidence: "Observed 12 passing tests" }),
    ).toBeTruthy();
    expect(store.tasks(id)[0].status).toBe("Verified");
  });
});
