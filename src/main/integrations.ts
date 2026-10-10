import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { z } from "zod";
import { redact } from "./importer.js";
import type { McpConfig, ProviderConfig, Message } from "../shared/types.js";
export function validateEndpoint(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.hash)
    throw new Error("URLs cannot contain credentials or fragments.");
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new Error("Use HTTPS, or HTTP on loopback for local services.");
  return url;
}
export const providerSchema = z.object({
  kind: z.enum(["openai", "anthropic", "ollama"]),
  endpoint: z.string().max(2000),
  model: z.string().min(1).max(200),
});
export async function requestChat(
  config: ProviderConfig,
  key: string,
  messages: Message[],
  signal?: AbortSignal,
) {
  validateEndpoint(config.endpoint);
  const base = config.endpoint.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  let url: string, body: unknown;
  if (config.kind === "anthropic") {
    url = base + "/v1/messages";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: config.model,
      max_tokens: 4096,
      system: messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n"),
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
    };
  } else if (config.kind === "ollama") {
    url = base + "/api/chat";
    body = { model: config.model, messages, stream: false };
  } else {
    url = base + "/chat/completions";
    if (key) headers.authorization = "Bearer " + key;
    body = { model: config.model, messages, max_tokens: 4096 };
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(120000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Provider returned HTTP ${response.status}. Check endpoint, model and credentials.`,
    );
  const data = await boundedJson(response);
  let text: string, usage: unknown;
  if (config.kind === "anthropic") {
    const parsed = z
      .object({
        content: z.array(
          z.object({ type: z.string(), text: z.string().optional() }),
        ),
        usage: z.unknown().optional(),
      })
      .parse(data);
    text = parsed.content.map((c) => c.text ?? "").join("\n");
    usage = parsed.usage;
  } else if (config.kind === "ollama") {
    const parsed = z
      .object({
        message: z.object({ content: z.string() }),
        prompt_eval_count: z.number().optional(),
        eval_count: z.number().optional(),
      })
      .parse(data);
    text = parsed.message.content;
    usage = { input: parsed.prompt_eval_count, output: parsed.eval_count };
  } else {
    const parsed = z
      .object({
        choices: z.array(
          z.object({ message: z.object({ content: z.string() }) }),
        ),
        usage: z.unknown().optional(),
      })
      .parse(data);
    text = parsed.choices[0]?.message.content ?? "";
    usage = parsed.usage;
  }
  return { text: redact(text).text, usage };
}
async function boundedJson(response: Response) {
  if (Number(response.headers.get("content-length")) > 10 * 1024 * 1024)
    throw new Error("Response too large.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty response.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 10 * 1024 * 1024) throw new Error("Response exceeds 10 MiB.");
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    await reader.cancel();
  }
}
export async function embed(endpoint: string, model: string, texts: string[]) {
  validateEndpoint(endpoint);
  const response = await fetch(endpoint.replace(/\/$/, "") + "/api/embed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
    redirect: "error",
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok)
    throw new Error(`Ollama embeddings HTTP ${response.status}`);
  const result = z
    .object({
      embeddings: z.array(z.array(z.number().finite()).min(1).max(8192)),
    })
    .parse(await boundedJson(response));
  if (result.embeddings.length !== texts.length)
    throw new Error("Embedding count mismatch.");
  return result.embeddings;
}
export const mcpSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  transport: z.enum(["stdio", "http"]),
  command: z.string().max(2000).optional(),
  args: z.array(z.string().max(2000)).max(50).optional(),
  url: z.string().max(2000).optional(),
});
export class McpManager {
  readonly clients = new Map<string, Client>();
  async connect(config: McpConfig) {
    const value = mcpSchema.parse(config);
    await this.disconnect(value.id);
    const client = new Client(
      { name: "mnemo", version: "0.1.0" },
      { capabilities: {} },
    );
    const transport =
      value.transport === "http"
        ? new StreamableHTTPClientTransport(validateEndpoint(value.url ?? ""))
        : new StdioClientTransport({
            command:
              value.command ||
              (() => {
                throw new Error("Command required.");
              })(),
            args: value.args ?? [],
            env: {
              PATH: process.env.PATH ?? "",
              SystemRoot: process.env.SystemRoot ?? "",
              TEMP: process.env.TEMP ?? "",
            },
            stderr: "pipe",
          });
    try {
      await client.connect(transport);
      this.clients.set(value.id, client);
      return await client.listTools();
    } catch (error) {
      await client.close().catch(() => {});
      throw error;
    }
  }
  client(id: string) {
    const client = this.clients.get(id);
    if (!client) throw new Error("MCP server is disconnected.");
    return client;
  }
  async disconnect(id: string) {
    const previous = this.clients.get(id);
    this.clients.delete(id);
    await previous?.close();
  }
  async close() {
    await Promise.allSettled(
      [...this.clients.keys()].map((id) => this.disconnect(id)),
    );
  }
}
