import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const children = [];
const run = (program, args) => {
  const child = spawn(program, args, { stdio: "inherit", shell: false });
  children.push(child);
  return child;
};
const compiler = run(process.execPath, [
  "node_modules/typescript/bin/tsc",
  "-p",
  "tsconfig.json",
]);
await new Promise((resolve) =>
  compiler.on("exit", (code) => {
    if (code) process.exit(code);
    resolve();
  }),
);
await import("./build-main.mjs");
run(process.execPath, ["node_modules/vite/bin/vite.js"]);
let ready = false;
for (let i = 0; i < 100; i++) {
  try {
    await fetch("http://127.0.0.1:5173");
    ready = true;
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
if (!ready) throw new Error("Vite failed to start.");
const electron = spawn(require("electron"), ["."], {
  stdio: "inherit",
  env: { ...process.env, MNEMO_DEV: "1" },
});
children.push(electron);
const cleanup = () => {
  children.forEach((c) => c.kill());
  process.exit();
};
electron.on("exit", cleanup);
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
