import { z } from "zod";
import { randomUUID } from "node:crypto";
import { memoryTypes, statuses, taskStatuses } from "../shared/types.js";
import { digest, redact } from "./importer.js";
import type { Store } from "./store.js";
const date = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");
const memory = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(100000),
  type: z.enum(memoryTypes),
  status: z.enum(statuses),
  source: z.string().max(2000),
  tags: z.array(z.string()).max(50),
  createdAt: date,
  updatedAt: date,
  verifiedAt: date.nullable(),
  version: z.number().int().min(1),
  confidence: z.number().min(0).max(100),
});
const archive = z.object({
  format: z.literal("mnemo.workspace"),
  version: z.literal(1),
  workspace: z.object({ id: z.string(), name: z.string() }),
  sessions: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        provider: z.string(),
        source: z.string(),
        createdAt: date,
        tags: z.array(z.string()),
        messages: z.array(
          z.object({
            role: z.string(),
            content: z.string().max(100000),
            timestamp: z.string().nullable().optional(),
          }),
        ),
      }),
    )
    .max(10000),
  memories: z.array(memory).max(100000),
  relationships: z
    .array(
      z.object({
        fromId: z.string(),
        toId: z.string(),
        kind: z.string().max(100),
      }),
    )
    .max(200000),
  tasks: z.array(
    z.object({
      id: z.string(),
      objective: z.string(),
      requirements: z.string(),
      environment: z.enum([
        "Local",
        "Development",
        "Test",
        "Staging",
        "Production",
      ]),
      status: z.enum(taskStatuses),
      evidence: z.string(),
      blockers: z.string(),
      sessionId: z.string().nullable(),
      memoryIds: z.array(z.string()),
    }),
  ),
  profiles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      instructions: z.string(),
      tools: z.array(z.string()),
      memoryTypes: z.array(z.enum(memoryTypes)),
      verification: z.string(),
    }),
  ),
  revisions: z
    .array(
      z.object({
        memoryId: z.string(),
        version: z.number().int(),
        snapshot: z.string(),
        createdAt: date,
      }),
    )
    .default([]),
  audit: z
    .array(
      z.object({
        action: z.string(),
        entityId: z.string(),
        detail: z.string(),
        createdAt: date,
      }),
    )
    .default([]),
});
export function restoreArchive(
  store: Store,
  workspaceId: string,
  text: string,
) {
  if (Buffer.byteLength(text) > 100 * 1024 * 1024)
    throw new Error(
      "Archive exceeds 100 MiB. Restore a database backup instead.",
    );
  const data = archive.parse(JSON.parse(redact(text).text));
  const checksum = digest(text);
  if (
    store.setting(`archive:${workspaceId}`, [] as string[]).includes(checksum)
  )
    return { memories: 0, sessions: 0, duplicate: true };
  return store.transaction(() => {
    const map = new Map<string, string>([[data.workspace.id, workspaceId]]);
    const remapSource = (source: string) =>
      source.replace(
        /session:([^#;\s]+)/g,
        (_whole, id: string) => `session:${map.get(id) ?? id}`,
      );
    for (const session of data.sessions) {
      const externalId = `archive:${data.workspace.id}:${session.id}`;
      store.importSessions(
        workspaceId,
        [
          {
            externalId,
            title: session.title,
            provider: session.provider,
            createdAt: session.createdAt,
            tags: session.tags,
            messages: session.messages.map((m) => ({
              ...m,
              timestamp: m.timestamp ?? undefined,
            })),
          },
        ],
        session.source,
      );
      const imported = store.get<{ id: string }>(
        "SELECT id FROM sessions WHERE workspaceId=? AND provider=? AND externalId=?",
        workspaceId,
        session.provider,
        externalId,
      )!;
      map.set(session.id, imported.id);
    }
    for (const value of data.memories) {
      const created = store.saveMemory(workspaceId, {
        ...value,
        id: undefined,
        source: remapSource(value.source),
      });
      map.set(value.id, created.id);
      store.run(
        "UPDATE memories SET createdAt=?,updatedAt=?,verifiedAt=?,version=?,confidence=? WHERE id=?",
        value.createdAt,
        value.updatedAt,
        value.verifiedAt,
        value.version,
        value.confidence,
        created.id,
      );
    }
    for (const profile of data.profiles) {
      const id = store.saveProfile(workspaceId, { ...profile, id: undefined });
      map.set(profile.id, id);
    }
    for (const task of data.tasks) {
      const id = store.saveTask(workspaceId, {
        ...task,
        id: undefined,
        sessionId: task.sessionId ? (map.get(task.sessionId) ?? null) : null,
        memoryIds: task.memoryIds.map((id) => {
          const mapped = map.get(id);
          if (!mapped) throw new Error("Task references missing memory.");
          return mapped;
        }),
      });
      map.set(task.id, id);
    }
    for (const relationship of data.relationships) {
      const from = map.get(relationship.fromId),
        to = map.get(relationship.toId);
      if (!from || !to)
        throw new Error("Archive relationship refers to a missing entity.");
      store.link(workspaceId, from, to, relationship.kind);
    }
    for (const revision of data.revisions) {
      const memoryId = map.get(revision.memoryId);
      if (!memoryId) throw new Error("Revision refers to missing memory.");
      const snapshot = memory.parse(JSON.parse(revision.snapshot));
      store.run(
        "INSERT INTO revisions VALUES(?,?,?,?,?)",
        randomUUID(),
        memoryId,
        revision.version,
        JSON.stringify({
          ...snapshot,
          id: memoryId,
          workspaceId,
          source: remapSource(snapshot.source),
        }),
        revision.createdAt,
      );
    }
    for (const event of data.audit)
      store.audit(
        workspaceId,
        `restored.${event.action}`,
        map.get(event.entityId) ?? workspaceId,
        `${event.createdAt}: ${event.detail}`,
      );
    store.setSetting(`archive:${workspaceId}`, [
      ...store.setting(`archive:${workspaceId}`, [] as string[]),
      checksum,
    ]);
    store.audit(
      workspaceId,
      "archive.restored",
      workspaceId,
      `${data.memories.length} memories; ${data.sessions.length} sessions; all identifiers remapped, no existing records overwritten.`,
    );
    return {
      memories: data.memories.length,
      sessions: data.sessions.length,
      duplicate: false,
    };
  });
}
