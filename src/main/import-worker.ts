import { parentPort, workerData } from "node:worker_threads";
import { Store } from "./store.js";
import type { ParsedSession } from "./importer.js";
const data = workerData as {
  path: string;
  workspaceId: string;
  sessions: ParsedSession[];
  source: string;
};
const store = new Store(data.path);
try {
  const result = store.importSessions(
    data.workspaceId,
    data.sessions,
    data.source,
  );
  parentPort?.postMessage({ result });
} catch (error) {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : "Import failed.",
  });
} finally {
  store.close();
}
