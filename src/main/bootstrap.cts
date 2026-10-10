import { createRequire } from "node:module";
const load = createRequire(__filename);
import { app, dialog } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
const customData = app.commandLine.getSwitchValue("data-dir");
if (customData) {
  if (!isAbsolute(customData))
    throw new Error("--data-dir must be an absolute path.");
  mkdirSync(customData, { recursive: true });
  app.setPath("userData", customData);
}
if (!app.isPackaged && process.env.MNEMO_TEST_DATA)
  app.setPath("userData", resolve(process.env.MNEMO_TEST_DATA));
mkdirSync(app.getPath("userData"), { recursive: true });
const log = resolve(app.getPath("userData"), "startup.log");
appendFileSync(log, "Bootstrap loaded\n");
// Electron readiness must not be gated by an entry module's top-level await.
void app
  .whenReady()
  .then(() => {
    appendFileSync(log, "Electron ready\n");
    return load("./index.cjs");
  })
  .catch((error) => {
    appendFileSync(log, "Startup failure: " + String(error) + "\n");
    console.error("MNEMO startup failed:", error);
    dialog.showErrorBox("MNEMO could not start", String(error));
    app.quit();
  });
