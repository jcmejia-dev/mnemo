import { _electron, expect } from "@playwright/test";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const folder = mkdtempSync(join(tmpdir(), "mnemo-packaged-"));
const executablePath =
  process.env.MNEMO_PACKAGED_EXE ?? resolve("release/win-unpacked/MNEMO.exe");
let app;
try {
  app = await _electron.launch({
    executablePath,
    args: [`--data-dir=${folder}`],
    timeout: 30000,
  });
  const page = await app.firstWindow();
  await expect(
    page.getByRole("button", { name: "Open a workspace", exact: true }),
  ).toBeVisible();
  await app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [folder],
    });
  }, folder);
  await page
    .getByRole("button", { name: "Open a workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Terminal", exact: true }).click();
  await page
    .getByRole("button", { name: "Open PowerShell", exact: true })
    .click();
  const input = page.locator(".xterm-helper-textarea");
  await expect(input).toBeAttached();
  await input.focus();
  await page.keyboard.type("Write-Output ('MNEMO_PACKAGED_' + 'PTY_OK')");
  await page.keyboard.press("Enter");
  await expect(page.locator(".xterm-screen")).toContainText(
    "MNEMO_PACKAGED_PTY_OK",
  );
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  mkdirSync("work", { recursive: true });
  await page.screenshot({
    path: "work/packaged-workspace.png",
    fullPage: true,
  });
  const packaged = await app.evaluate(({ app }) => app.isPackaged);
  if (!packaged) throw new Error("Expected packaged Electron app.");
  console.log(
    "Packaged Electron startup, isolated workspace and real PowerShell output verified.",
  );
} finally {
  await app?.close();
  rmSync(folder, { recursive: true, force: true });
}
