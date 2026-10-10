import { Store, estimateTokens } from "../dist-electron/main/store.js";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, cpus, totalmem, platform, release } from "node:os";
import { join } from "node:path";
const work = mkdtempSync(join(tmpdir(), "mnemo-bench-"));
const report = {
  date: new Date().toISOString(),
  host: {
    platform: platform(),
    release: release(),
    cpu: cpus()[0].model,
    memoryGiB: totalmem() / 2 ** 30,
    node: process.version,
  },
  estimator: "ceil(UTF-8 bytes / 4), not a provider tokenizer",
  performance: [],
  context: [],
};
try {
  for (const count of [100, 1000, 10000]) {
    const store = new Store(join(work, `${count}.db`));
    const workspace = store.addWorkspace(work, `Synthetic ${count}`);
    const sessions = Array.from({ length: count }, (_, i) => ({
      externalId: `synthetic-${i}`,
      provider: "synthetic-v1",
      title: `Investigation ${i}`,
      createdAt: "2026-01-01T00:00:00.000Z",
      tags: ["synthetic"],
      messages: [
        {
          role: "user",
          content: `Service ${i} failed because a synthetic authentication token expired. Preserve request ID R-${i}.`,
        },
        {
          role: "assistant",
          content: `Refresh the synthetic token for service ${i}. ${"Synthetic irrelevant conversation. ".repeat(20)}`,
        },
      ],
    }));
    const start = performance.now();
    store.importSessions(workspace.id, sessions, "synthetic");
    const indexingMs = performance.now() - start;
    const memoryStart = performance.now();
    store.transaction(() => {
      for (let i = 0; i < count; i++)
        store.saveMemory(workspace.id, {
          title: `Service ${i} authentication`,
          content: `Refresh the expired authentication token for service ${i}; preserve request ID R-${i}.`,
          type: "Debugging Lesson",
          status: "Confirmed",
          source: `synthetic:service-${i}`,
          tags: ["synthetic"],
        });
    });
    const memoryIndexingMs = performance.now() - memoryStart;
    const search = [];
    let bundle;
    for (let i = 0; i < 20; i++) {
      const time = performance.now();
      bundle = store.retrieve(workspace.id, "authentication service 42", 1000);
      search.push(performance.now() - time);
    }
    search.sort((a, b) => a - b);
    const sessionStart = performance.now();
    store.sessions(workspace.id, "authentication", 100);
    const sessionSearchMs = performance.now() - sessionStart;
    const incremental = performance.now();
    const duplicate = store.importSessions(workspace.id, sessions, "synthetic");
    const duplicateMs = performance.now() - incremental;
    report.performance.push({
      sessions: count,
      memories: count,
      indexingMs,
      memoryIndexingMs,
      keywordRetrievalP50Ms: search[10],
      keywordRetrievalP95Ms: search[18],
      sessionSearchMs,
      duplicateScanMs: duplicateMs,
      duplicates: duplicate.duplicates,
      rssMiB: process.memoryUsage().rss / 2 ** 20,
      contextTokens: bundle.tokens,
    });
    store.close();
  }
  const store = new Store(join(work, "quality.db"));
  const workspace = store.addWorkspace(work, "Synthetic quality");
  const fixtures = [
    {
      query: "authentication token expired",
      title: "Token refresh procedure",
      critical: "Preserve request ID",
      answer: "refresh token",
      content:
        "When an authentication token expired, refresh token; Preserve request ID. Never log the secret token.",
    },
    {
      query: "sqlite database locked",
      title: "SQLite contention procedure",
      critical: "busy_timeout=5000",
      answer: "enable WAL",
      content:
        "For sqlite database locked errors, enable WAL and busy_timeout=5000. Do not disable foreign keys.",
    },
    {
      query: "production migration approval",
      title: "Production migration procedure",
      critical: "explicit approval",
      answer: "dry run",
      content:
        "Before a production migration, perform a dry run and obtain explicit approval. Never infer the target environment from the database name.",
    },
  ];
  const transcript =
    "Synthetic conversation unrelated to the current task. ".repeat(500) +
    fixtures.map((f) => f.content).join("\n");
  store.importSessions(
    workspace.id,
    [
      {
        externalId: "benchmark",
        provider: "synthetic-v1",
        title: "Mixed tasks",
        createdAt: "2026-01-01",
        tags: [],
        messages: [{ role: "user", content: transcript }],
      },
    ],
    "synthetic",
  );
  for (const fixture of fixtures)
    store.saveMemory(workspace.id, {
      title: fixture.title,
      content: fixture.content,
      type: "Procedure",
      status: "Confirmed",
      source: "synthetic fixture",
      tags: [],
    });
  for (const fixture of fixtures) {
    for (const approach of [
      "Full conversation",
      "Naive extractive summary",
      "MNEMO retrieval",
    ]) {
      const start = performance.now();
      const context =
        approach === "Full conversation"
          ? transcript
          : approach === "Naive extractive summary"
            ? [
                ...new Set(
                  (transcript.match(/[^.!?]+[.!?]?/g) ?? []).map((sentence) =>
                    sentence.trim(),
                  ),
                ),
              ]
                .slice(0, 5)
                .join(" ")
            : store.retrieve(workspace.id, fixture.query, 600).text;
      report.context.push({
        task: fixture.query,
        approach,
        tokens: estimateTokens(context),
        containsExpectedEvidence: context.includes(fixture.answer),
        missingCriticalConstraint: !context.includes(fixture.critical),
        latencyMs: performance.now() - start,
        answerCorrectness: "Not measured: no model was invoked",
        cost: "Not measured: no API call",
      });
    }
  }
  store.close();
  mkdirSync("benchmarks", { recursive: true });
  writeFileSync(
    "benchmarks/results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(work, { recursive: true, force: true });
}
