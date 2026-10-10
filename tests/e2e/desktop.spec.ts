import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let app: ElectronApplication;
let folder: string;
test.beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), "mnemo-desktop-"));
  app = await electron.launch({
    executablePath: require("electron"),
    args: ["."],
    env: { ...process.env, MNEMO_TEST_DATA: folder, MNEMO_DEV: "0" },
  });
});
test.afterEach(async () => {
  await app?.close();
  rmSync(folder, { recursive: true, force: true });
});
async function workspace() {
  await app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [folder],
    });
  }, folder);
  const page = await app.firstWindow();
  await page
    .getByRole("button", { name: "Open a workspace", exact: true })
    .click();
  await expect(page.getByLabel("Active environment")).toBeVisible();
  return page;
}
test("real desktop persistence, context, graph and PowerShell", async () => {
  const page = await workspace();
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.getByRole("button", { name: /^Memory/ }).click();
  await page.getByRole("button", { name: "New memory" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Expired authentication token");
  await page
    .getByLabel("Content", { exact: true })
    .fill(
      "Refresh an expired authentication token before retrying the API request. Preserve the original request ID.",
    );
  await page.getByLabel("Verification status").selectOption("Confirmed");
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Memory details" }),
  ).toBeVisible();
  await page.getByLabel("Close memory details").click();
  await page.getByLabel("Current task").fill("authentication token");
  await page
    .getByRole("button", { name: "Retrieve context", exact: true })
    .click();
  await expect(page.locator(".context-hit strong")).toHaveText(
    "Expired authentication token",
  );
  await page
    .getByRole("button", { name: "Knowledge Graph", exact: true })
    .click();
  await expect(
    page.locator(".graph-node strong", {
      hasText: "Expired authentication token",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Terminal", exact: true }).click();
  await page
    .getByRole("button", { name: "Open PowerShell", exact: true })
    .click();
  await expect(page.locator(".xterm-helper-textarea")).toBeAttached();
  await page.locator(".xterm-helper-textarea").focus();
  await page.keyboard.type("Write-Output ('MNEMO_' + 'PTY_VERIFIED')");
  await page.keyboard.press("Enter");
  await expect(page.locator(".xterm-screen")).toContainText(
    "MNEMO_PTY_VERIFIED",
  );
  await page.waitForTimeout(800);
  await expect(page.locator(".xterm-screen")).toContainText("PS ");
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  mkdirSync("work", { recursive: true });
  await page.screenshot({ path: "work/desktop-workspace.png", fullPage: true });
  const settings = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    return w.webContents.getLastWebPreferences();
  });
  expect(settings.nodeIntegration).toBe(false);
  expect(settings.contextIsolation).toBe(true);
  expect(settings.sandbox).toBe(true);
  expect(
    await page.evaluate(
      () => typeof (window as unknown as { require?: unknown }).require,
    ),
  ).toBe("undefined");
  await app.close();
  app = await electron.launch({
    executablePath: require("electron"),
    args: ["."],
    env: { ...process.env, MNEMO_TEST_DATA: folder, MNEMO_DEV: "0" },
  });
  const reopened = await app.firstWindow();
  await reopened.getByRole("button", { name: /^Memory/ }).click();
  await expect(reopened.locator(".memory-card h3")).toHaveText(
    "Expired authentication token",
  );
  expect(failures).toEqual([]);
});
test("permission refusal blocks MCP launch and AI transmission", async () => {
  const page = await workspace();
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({
      response: 0,
      checkboxChecked: false,
    });
  });
  const outcome = await page.evaluate(async () => {
    await window.mnemo.call("mcp.save", {
      name: "Untrusted server",
      transport: "stdio",
      command: "does-not-exist",
    });
    const snapshot = await window.mnemo.call<{ mcp: { id: string }[] }>(
      "snapshot",
    );
    try {
      await window.mnemo.call("mcp.connect", { id: snapshot.mcp[0].id });
    } catch (error) {
      return String(error);
    }
    return "unexpected success";
  });
  expect(outcome).toContain("cancelled");
  const chat = await page.evaluate(async () => {
    try {
      await window.mnemo.call("chat.send", {
        message: "Synthetic transmission",
      });
    } catch (error) {
      return String(error);
    }
    return "unexpected success";
  });
  expect(chat).toContain("cancelled");
});
test("task verification requires evidence and import preview is atomic", async () => {
  const page = await workspace();
  const outcome = await page.evaluate(async () => {
    try {
      await window.mnemo.call("task.save", {
        objective: "Test task",
        requirements: "",
        environment: "Test",
        status: "Verified",
        evidence: "",
        blockers: "",
      });
    } catch (error) {
      return String(error);
    }
    return "unexpected success";
  });
  expect(outcome).toContain("evidence");
  const unknown = await page.evaluate(async () => {
    try {
      await window.mnemo.call("filesystem.read", { path: "C:\\private" });
    } catch (error) {
      return String(error);
    }
    return "unexpected success";
  });
  expect(unknown).toContain("Unsupported");
});

test("imports through a reviewed worker, extracts proposals, and skips duplicates", async () => {
  const page = await workspace();
  const source = join(folder, "synthetic.json");
  writeFileSync(
    source,
    JSON.stringify({
      id: "synthetic-v1",
      title: "Synthetic API debugging",
      messages: [
        {
          role: "user",
          content: "The API failed because the authentication token expired.",
        },
        {
          role: "assistant",
          content: "Refresh the token and preserve the request ID.",
        },
      ],
    }),
  );
  await app.evaluate(({ dialog }, source) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [source],
    });
  }, source);
  await page.getByRole("button", { name: /^Sessions/ }).click();
  await page
    .getByRole("button", { name: "Import session", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Import preview" }),
  ).toContainText("2 messages");
  await page
    .getByRole("button", { name: "Import locally", exact: true })
    .click();
  await expect(page.locator(".session-row strong")).toHaveText(
    "Synthetic API debugging",
  );
  await page.locator(".session-row").click();
  await page
    .getByRole("button", { name: "Propose memories", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("1 memory proposals");
  await page.getByRole("button", { name: /^Memory/ }).click();
  await expect(page.locator(".memory-card .badge")).toHaveText("Proposed");
  await page.getByRole("button", { name: /^Sessions/ }).click();
  await page
    .getByRole("button", { name: "Import session", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import locally", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("1 duplicates skipped");
  const snapshot = await page.evaluate(() =>
    window.mnemo.call<{ counts: { sessions: number; memories: number } }>(
      "snapshot",
    ),
  );
  expect(snapshot.counts).toEqual({ sessions: 1, memories: 1 });
});
