import { expect, it } from "vitest";
import { Store } from "../src/main/store.js";
import { restoreArchive } from "../src/main/archive.js";
it("round-trips archived knowledge and sources without overwriting existing data", () => {
  const store = new Store(":memory:");
  const a = store.addWorkspace("/a", "A");
  store.importSessions(
    a.id,
    [
      {
        externalId: "one",
        title: "Example",
        provider: "test",
        createdAt: "2026-01-01",
        tags: [],
        messages: [{ role: "user", content: "A source" }],
      },
    ],
    "test",
  );
  const session = store.sessions(a.id)[0];
  const memory = store.saveMemory(a.id, {
    title: "A decision",
    content: "Preserve source references.",
    type: "Technical Decision",
    status: "Proposed",
    source: `session:${session.id}#message:0`,
    tags: [],
  });
  store.saveMemory(a.id, { ...memory, status: "Confirmed" });
  store.link(a.id, memory.id, session.id, "derived from");
  const archive = JSON.stringify(store.exportWorkspace(a.id));
  const b = store.addWorkspace("/b", "B");
  const existing = store.saveMemory(b.id, {
    title: "Existing",
    content: "Keep me",
    type: "Verified Fact",
    status: "Confirmed",
    source: "test",
    tags: [],
  });
  const result = restoreArchive(store, b.id, archive);
  expect(result.memories).toBe(1);
  expect(store.memories(b.id)).toHaveLength(2);
  const restored = store.memories(b.id).find((m) => m.title === "A decision")!;
  expect(restored.source).toContain(store.sessions(b.id)[0].id);
  expect(restored.id).not.toBe(memory.id);
  expect(store.revisions(b.id, restored.id)).toHaveLength(1);
  expect(store.memory(b.id, existing.id).content).toBe("Keep me");
  expect(restoreArchive(store, b.id, archive).duplicate).toBe(true);
  store.close();
});
it("rejects malformed archives before changing the workspace", () => {
  const store = new Store(":memory:");
  const a = store.addWorkspace("/a", "A");
  expect(() => restoreArchive(store, a.id, '{"format":"unknown"}')).toThrow();
  expect(store.memories(a.id)).toHaveLength(0);
  store.close();
});
