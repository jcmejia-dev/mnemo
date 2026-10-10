# Development

## Setup

Use x64 Windows with Node 24 LTS and npm. Run `npm ci`, then `node node_modules/electron/install.js`, then `npm run dev`. The latter compiles TypeScript, builds the trusted main bundle, starts loopback Vite and launches Electron. Renderer changes hot reload; main/preload edits require restarting dev. For a production build, use `npm run build` and `npm start`.

## Source layout

```text
src/main/        trusted desktop services, Store, import adapters, MCP/AI
src/shared/      IPC/result types and enumerations
src/renderer/    real desktop UI, terminal panes and stored graph
migrations/     distributed initial SQL migration
tests/          unit and integration tests
tests/e2e/      real Electron desktop workflow tests
scripts/        build, benchmark, packaged smoke and development entry points
benchmarks/     recorded synthetic measurements
.github/        Windows checks and gated versioned release workflow
assets/         original application identity
```

The process boundary uses a preload allowlist plus main validation. Add a capability to both places, bound its input/output, and write a meaningful permission or persistence test. Network clients and secrets must remain in main. Never auto-invoke terminal writes from imported or AI-generated content.

## Verification

`npm run check` performs ESLint, both TypeScript targets, Vitest unit/integration tests and a Vite production build. `npm run test:e2e` starts the actual pinned Electron and PowerShell with temporary test workspaces; it does not modify personal session stores. Tests replace native file/approval dialogs from Playwright's trusted main-process test driver, not through a production IPC bypass.

`npm run benchmark` measures synthetic Store performance and context retention at 100/1,000/10,000 sessions. `node scripts/desktop-benchmark.mjs` measures a bounded graph in real Electron. These scripts write reproducible JSON reports. They use temporary databases and no API keys.

`npm run package` builds an unsigned x64 NSIS installer in `release/`. On Windows, node-pty's shipped N-API binaries and bundled ConPTY DLL are used; `npmRebuild: false` avoids unnecessary C++ ABI rebuilds. This is valid for the tested Windows/x64 dependency set, not a universal instruction for Linux/macOS. Run `node scripts/packaged-smoke.mjs` after packaging to verify the bundled executable and native terminal.

## Troubleshooting

| Symptom | Action |
|---|---|
| Electron binary missing | Run `node node_modules/electron/install.js`; inspect npm install-script policy |
| Native terminal cannot load | Reinstall locked dependencies; verify platform/x64 and node-pty prebuilds; do not copy binaries from another ABI |
| C++ toolchain requested by builder | Ensure the checked-in `npmRebuild: false` and tested Windows N-API package are used |
| No window at startup | Inspect `startup.log` in userData; use the callback-based CommonJS bootstrap; avoid a readiness-gating top-level await |
| Terminal shutdown hangs | Verify `useConptyDll` is enabled on Windows and the DLL is present in unpacked package resources |
| Transcript rejected | Use supported canonical JSON-v1 or text/Markdown; unknown JSONL/provider formats are intentionally rejected |
| Session changed on reimport | Preserve existing messages and append, or use a new session ID to keep both versions |
| Empty retrieval | Confirm active workspace, search terms, exclusions and statuses; no matching evidence means no invented context |
| Semantic search unavailable | Install the selected Ollama embedding model and authorize index creation; keyword retrieval still works |
| HTTP provider error | Verify base URL convention, authorized key and model; keys clear when provider origin/kind changes |
| MCP connection fails | Inspect executable/arguments, transport support and authentication needs; UI OAuth configuration is not implemented |
| Backup restore lock | Close all MNEMO processes before replacing a database; retain a backup of the original directory |

## Release process

Update `package.json`, lockfile and CHANGELOG, run all required local checks and packaged smoke, and generate SHA-256 checksums. Push a matching version tag only when authorized to publish. The release workflow rechecks tag/version, lint/types/tests/build, runtime dependency audit, Windows packaging and packaged smoke before its publish job. It creates an unsigned prerelease; no signing credentials are embedded. Workflows are supplied locally but were not executed on GitHub in this session.

The release workflow has no deployment secrets except its repository-scoped GitHub token. Future signing or auto-update work needs valid credentials, an explicit trust/update model and a separate review.
