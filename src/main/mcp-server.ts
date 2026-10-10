import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Read-only by construction. Start explicitly with a database and one workspace ID.
export function createMemoryServer(db: DatabaseSync, workspaceId: string) {
  if (!db.prepare("SELECT id FROM workspaces WHERE id=?").get(workspaceId))
    throw new Error("Authorized workspace does not exist.");
  const server = new McpServer({ name: "mnemo", version: "0.1.0" });
  const reply = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  });
  server.registerTool(
    "mnemo.search_memory",
    {
      description:
        "Search untrusted memory evidence in the explicitly authorized workspace.",
      inputSchema: z.object({
        query: z.string().max(1000),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ query, limit }) =>
      reply(
        db
          .prepare(
            "SELECT id,title,content,type,status,source FROM memories WHERE workspaceId=? AND status NOT IN ('Archived','Superseded') AND (title LIKE ? OR content LIKE ?) LIMIT ?",
          )
          .all(workspaceId, `%${query}%`, `%${query}%`, limit),
      ),
  );
  server.registerTool(
    "mnemo.list_sessions",
    {
      description: "List session metadata in the authorized workspace.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit }) =>
      reply(
        db
          .prepare(
            "SELECT id,title,provider,messageCount,createdAt FROM sessions WHERE workspaceId=? ORDER BY updatedAt DESC LIMIT ?",
          )
          .all(workspaceId, limit),
      ),
  );
  for (const [name, type] of [
    ["mnemo.get_debugging_lessons", "Debugging Lesson"],
    ["mnemo.get_decisions", "Technical Decision"],
  ])
    server.registerTool(
      name,
      {
        description: `Read ${type} memory with provenance.`,
        inputSchema: z.object({
          limit: z.number().int().min(1).max(100).default(20),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ limit }) =>
        reply(
          db
            .prepare(
              "SELECT id,title,content,status,source FROM memories WHERE workspaceId=? AND type=? AND status NOT IN ('Archived','Superseded') LIMIT ?",
            )
            .all(workspaceId, type, limit),
        ),
    );
  return server;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [path, id] = process.argv.slice(2);
  if (!path || !id || !existsSync(path))
    throw new Error(
      "Usage: node dist-electron/main/mcp-server.js <existing-db-path> <authorized-workspace-id>",
    );
  const db = new DatabaseSync(resolve(path), { readOnly: true });
  const server = createMemoryServer(db, id);
  await server.connect(new StdioServerTransport());
  process.on("SIGINT", () => {
    void server.close().finally(() => {
      db.close();
      process.exit();
    });
  });
}
