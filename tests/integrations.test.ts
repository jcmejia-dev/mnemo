import { afterEach, describe, expect, it, vi } from "vitest";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { DatabaseSync } from "node:sqlite";
import { Store } from "../src/main/store.js";
import { createMemoryServer } from "../src/main/mcp-server.js";
import {
  validateEndpoint,
  requestChat,
  embed,
  McpManager,
} from "../src/main/integrations.js";
afterEach(() => vi.unstubAllGlobals());
describe("provider adapters", () => {
  it("rejects insecure remote URLs and embedded credentials", () => {
    expect(() => validateEndpoint("http://example.com")).toThrow("HTTPS");
    expect(() => validateEndpoint("https://user:secret@example.com")).toThrow(
      "credentials",
    );
    expect(validateEndpoint("http://127.0.0.1:11434").hostname).toBe(
      "127.0.0.1",
    );
  });
  it.each(["openai", "anthropic", "ollama"] as const)(
    "decodes %s responses and usage",
    async (kind) => {
      const response =
        kind === "openai"
          ? {
              choices: [{ message: { content: "Synthetic answer" } }],
              usage: { total_tokens: 10 },
            }
          : kind === "anthropic"
            ? {
                content: [{ type: "text", text: "Synthetic answer" }],
                usage: { input_tokens: 2 },
              }
            : { message: { content: "Synthetic answer" }, eval_count: 8 };
      const fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(response)));
      vi.stubGlobal("fetch", fetch);
      const result = await requestChat(
        { kind, endpoint: "https://example.com", model: "synthetic" },
        "secret",
        [{ role: "user", content: "test" }],
      );
      expect(result.text).toBe("Synthetic answer");
      expect(result.usage).toBeTruthy();
      expect(fetch.mock.calls[0][1].redirect).toBe("error");
    },
  );
  it("reports provider errors without logging response secrets", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("password:secret", { status: 401 })),
    );
    await expect(
      requestChat(
        { kind: "openai", endpoint: "https://example.com", model: "test" },
        "key",
        [],
      ),
    ).rejects.toThrow("HTTP 401");
  });
  it("validates embedding response shapes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ embeddings: [[1, 0, 0]] })),
        ),
    );
    expect(await embed("http://localhost:11434", "test", ["one"])).toEqual([
      [1, 0, 0],
    ]);
  });
});
describe("MCP protocol", () => {
  it("connects, discovers, invokes and isolates workspace data", async () => {
    const store = new Store(":memory:");
    const workspace = store.addWorkspace("/synthetic", "Synthetic");
    store.saveMemory(workspace.id, {
      title: "SQLite auth",
      content: "Synthetic evidence",
      type: "Technical Decision",
      status: "Confirmed",
      source: "test",
      tags: [],
    });
    const other = store.addWorkspace("/other", "Other");
    store.saveMemory(other.id, {
      title: "Private auth",
      content: "Must not leak",
      type: "Technical Decision",
      status: "Confirmed",
      source: "test",
      tags: [],
    });
    const server = createMemoryServer(store.db, workspace.id);
    const client = new Client({ name: "test", version: "1" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    expect((await client.listTools()).tools).toHaveLength(4);
    const result = await client.callTool({
      name: "mnemo.search_memory",
      arguments: { query: "auth" },
    });
    expect(JSON.stringify(result)).toContain("SQLite auth");
    expect(JSON.stringify(result)).not.toContain("Must not leak");
    await client.close();
    await server.close();
    store.close();
  });
  it("rejects a nonexistent authorized workspace and disconnected server", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE workspaces(id TEXT)");
    expect(() => createMemoryServer(db, "bad")).toThrow("does not exist");
    expect(() => new McpManager().client("bad")).toThrow("disconnected");
    db.close();
  });
});
