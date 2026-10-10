import { _electron, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { Store } from "../dist-electron/main/store.js";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const folder = mkdtempSync(join(tmpdir(), "mnemo-graph-benchmark-"));
const rows = [];
try {
  for (const count of [100, 1000, 10000]) {
    const path = join(folder, String(count));
    mkdirSync(path, { recursive: true });
    const store = new Store(join(path, "mnemo.db"));
    const workspace = store.addWorkspace(path, "Synthetic graph");
    store.transaction(() => {
      for (let i = 0; i < count; i++) {
        const memory = store.saveMemory(workspace.id, {
          title: `Synthetic decision ${i}`,
          content: `Synthetic reference ${i}`,
          type: "Technical Decision",
          status: "Proposed",
          source: "synthetic benchmark",
          tags: [],
        });
        store.link(workspace.id, workspace.id, memory.id, "contains");
      }
    });
    store.setSetting("activeWorkspace", workspace.id);
    store.close();
    const start = performance.now();
    const app = await _electron.launch({
      executablePath: require("electron"),
      args: ["."],
      env: { ...process.env, MNEMO_TEST_DATA: path, MNEMO_DEV: "0" },
    });
    try {
      const page = await app.firstWindow();
      await expect(
        page.getByRole("heading", { name: "Synthetic graph", exact: true }),
      ).toBeVisible();
      const startupMs = performance.now() - start;
      const graphStart = performance.now();
      await page
        .getByRole("button", { name: "Knowledge Graph", exact: true })
        .click();
      await expect(page.locator(".react-flow__node")).toHaveCount(
        Math.min(count + 1, 300),
      );
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const graphReadyMs = performance.now() - graphStart;
      const interactionStart = performance.now();
      await page.locator(".react-flow__controls-zoomin").click();
      await page.getByLabel("Highlight graph").fill("decision 5");
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      rows.push({
        storedMemories: count,
        visibleNodes: await page.locator(".react-flow__node").count(),
        startupMs,
        graphReadyMs,
        zoomAndHighlightMs: performance.now() - interactionStart,
        scope: "Bounded 300-node view; not rendering the entire graph",
      });
    } finally {
      await app.close();
    }
  }
  mkdirSync("benchmarks", { recursive: true });
  writeFileSync(
    "benchmarks/desktop-results.json",
    JSON.stringify({ date: new Date().toISOString(), runs: rows }, null, 2) +
      "\n",
  );
  console.log(JSON.stringify(rows, null, 2));
} finally {
  rmSync(folder, { recursive: true, force: true });
}
