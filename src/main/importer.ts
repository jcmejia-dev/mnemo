import { createHash } from "node:crypto";
import { z } from "zod";
import type { Message } from "../shared/types.js";
export interface ParsedSession {
  externalId: string;
  title: string;
  provider: string;
  createdAt: string;
  messages: Message[];
  tags: string[];
}
const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool", "human"]),
  content: z.union([
    z.string(),
    z.array(z.object({ type: z.string(), text: z.string().optional() })),
  ]),
  timestamp: z.string().optional(),
});
const sessionSchema = z.object({
  id: z.string().optional(),
  uuid: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  provider: z.string().optional(),
  createdAt: z.string().optional(),
  created_at: z.string().optional(),
  messages: z.array(messageSchema).min(1).max(50000),
  tags: z.array(z.string()).max(50).optional(),
});
export function digest(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
export function redact(text: string): { text: string; count: number } {
  let count = 0;
  const patterns = [
    /\b(?:sk|sk-ant|ghp|github_pat)[-_][A-Za-z0-9_-]{16,}\b/g,
    /(\b(?:api[_-]?key|password|secret|access[_-]?token|authorization)\s*[:=]\s*)(?:Bearer\s+)?[^\s,"'}]+/gi,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  ];
  for (const pattern of patterns)
    text = text.replace(pattern, (_whole, prefix: unknown) => {
      count++;
      return typeof prefix === "string" ? prefix + "[REDACTED]" : "[REDACTED]";
    });
  return { text, count };
}
export function parseImport(
  text: string,
  filename: string,
): { sessions: ParsedSession[]; redactions: number; warnings: string[] } {
  if (Buffer.byteLength(text) > 20 * 1024 * 1024)
    throw new Error("Import exceeds the 20 MiB limit. Split the export.");
  const safe = redact(text);
  let sessions: ParsedSession[];
  const warnings = [
    "Imported text is untrusted evidence. No commands or instructions will run.",
  ];
  if (filename.toLowerCase().endsWith(".json")) {
    let raw: unknown;
    try {
      raw = JSON.parse(safe.text);
    } catch {
      throw new Error(
        "Invalid JSON. Use MNEMO transcript v1 or a supported Claude export.",
      );
    }
    const envelope = z
      .object({
        format: z.literal("mnemo.transcripts"),
        version: z.literal(1),
        sessions: z.array(z.unknown()).max(10000),
      })
      .safeParse(raw);
    const items = envelope.success
      ? envelope.data.sessions
      : Array.isArray(raw)
        ? raw
        : [raw];
    if (items.length > 10000) throw new Error("Too many sessions.");
    sessions = items.map((item, index) => {
      // Claude export v1 uses chat_messages with sender and content/text.
      let normalized = item;
      if (item && typeof item === "object" && "chat_messages" in item) {
        const claude = z
          .object({
            uuid: z.string(),
            name: z.string(),
            created_at: z.string(),
            chat_messages: z.array(
              z.object({
                sender: z.enum(["human", "assistant"]),
                text: z.string().optional(),
                content: z
                  .array(
                    z.object({ type: z.string(), text: z.string().optional() }),
                  )
                  .optional(),
                created_at: z.string().optional(),
              }),
            ),
          })
          .parse(item);
        normalized = {
          id: claude.uuid,
          title: claude.name,
          createdAt: claude.created_at,
          provider: "claude-export-v1",
          messages: claude.chat_messages.map((m) => ({
            role: m.sender,
            content: m.text ?? m.content ?? [],
            timestamp: m.created_at,
          })),
        };
      }
      const result = sessionSchema.safeParse(normalized);
      if (!result.success)
        throw new Error(
          `Session ${index + 1}: unsupported schema. Expected messages [{role, content}]. No data was imported.`,
        );
      const s = result.data;
      const messages = s.messages.map((m) => ({
        role: m.role === "human" ? "user" : m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : m.content
                .filter((c) => c.type === "text")
                .map((c) => c.text ?? "")
                .join("\n"),
        timestamp: m.timestamp,
      }));
      const createdAt = s.createdAt ?? s.created_at ?? new Date().toISOString();
      if (Number.isNaN(Date.parse(createdAt)))
        throw new Error("Invalid session creation date.");
      return {
        externalId: s.id ?? s.uuid ?? digest(JSON.stringify(messages)),
        title: (s.title ?? s.name ?? `Imported session ${index + 1}`).slice(
          0,
          200,
        ),
        provider: s.provider ?? "json-v1",
        createdAt,
        messages,
        tags: s.tags ?? [],
      };
    });
  } else if (/\.(md|txt)$/i.test(filename)) {
    const messages: Message[] = [];
    let role = "user",
      lines: string[] = [];
    const flush = () => {
      if (lines.join("\n").trim())
        messages.push({ role, content: lines.join("\n").trim() });
      lines = [];
    };
    for (const line of safe.text.split(/\r?\n/)) {
      const match = line.match(
        /^(?:#{1,4}\s*)?(user|assistant|system|human|tool)\s*:\s*(.*)$/i,
      );
      if (match) {
        flush();
        role =
          match[1].toLowerCase() === "human" ? "user" : match[1].toLowerCase();
        lines.push(match[2]);
      } else lines.push(line);
    }
    flush();
    if (!messages.length) throw new Error("The transcript is empty.");
    sessions = [
      {
        externalId: digest(safe.text),
        title: filename.replace(/\.[^.]+$/, ""),
        provider: "text-v1",
        createdAt: new Date().toISOString(),
        messages,
        tags: [],
      },
    ];
  } else throw new Error("Supported imports: .json, .md, .txt.");
  return { sessions, redactions: safe.count, warnings };
}
export function proposals(messages: Message[]) {
  const rules: [RegExp, string][] = [
    [
      /\b(failed|error|fixed|resolved|caused by|because)\b/i,
      "Debugging Lesson",
    ],
    [/\b(decided|decision|we chose|must use)\b/i, "Technical Decision"],
    [/\b(always|convention|procedure|steps)\b/i, "Procedure"],
    [/\b(unresolved|open question|not sure|blocker)\b/i, "Open Question"],
    [/\b(requires|only works|environment|version)\b/i, "Environment"],
  ];
  const seen = new Set<string>();
  return messages
    .flatMap((message, index) =>
      message.content.split(/\n|(?<=[.!?])\s+/).flatMap((line) => {
        line = line.trim();
        const rule = rules.find(([pattern]) => pattern.test(line));
        const key = digest(line.toLowerCase());
        if (!rule || line.length < 30 || line.length > 1500 || seen.has(key))
          return [];
        seen.add(key);
        return [
          {
            title: line.slice(0, 100),
            content: line,
            type: rule[1],
            messageIndex: index,
          },
        ];
      }),
    )
    .slice(0, 100);
}
