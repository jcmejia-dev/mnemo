# MNEMO

**An intelligent, local-first workspace for developers and AI agents.**

MNEMO combines a real PowerShell terminal, imported development sessions, source-backed memory, task records, context retrieval and a knowledge graph in an Electron desktop app. The core works offline without an account or API key.

Version **0.1.0 is a functional developer preview**. It is newly written software, contains no employer data, and uses synthetic test fixtures. The production roadmap is in [ROADMAP.md](ROADMAP.md). Do not equate a packaged preview with a completed security audit or every feature in the original product vision.

## Install on Windows

1. Download or build `MNEMO-0.1.0-x64-setup.exe` and compare its SHA-256 with `SHA256SUMS.txt`.
2. Run the installer and choose the installation folder. The installer is unsigned; no signing identity has been supplied.
3. Open MNEMO, select **Open a workspace**, and choose your project folder.
4. Open **Terminal → Open PowerShell** for a real shell in that folder.
5. Import an authorized transcript in **Sessions**, review the preview, and select **Import locally**.
6. Select a session and **Propose memories**. Review each proposal in **Memory** before confirming it.
7. Enter a task in the right panel and retrieve a context bundle. Inspect its sources and any contradictions before copying or sending it.

Windows 10 build 19045 x64 was used for local verification. Windows 11 is a packaging target but has not been tested here. macOS/Linux installers are not provided.

## What works

- Multiple local workspaces and explicit environment labels.
- SQLite WAL persistence, versioned schema, FTS5 indexing and a Drizzle query adapter.
- Real node-pty PowerShell terminals: up to eight tabs, two-pane split view, resize, output search, copy/paste and configurable appearance. History is owned by the shell. Shell exit status is displayed; individual command success is not inferred.
- Versioned JSON, Claude-export-v1, Markdown and text imports with previews, known-secret redaction, duplicate detection and append-only incremental message indexing. Imports commit in a worker thread.
- Memory creation, editing, confirmation, dispute, supersession, rejection/archive, merging, revision history, tags and source references.
- Deterministic local extraction proposals with exact session/message provenance. Extractive session summaries are explicitly unverified.
- FTS5 retrieval ranked with verification, recency and actual relationships; optional Ollama embeddings and cosine similarity. Context budgets, pinning, exclusions, citations, diagnostics and stored contradictions are visible.
- Interactive React Flow graph with real stored edges, category filtering, highlight search, pan/zoom, focus, node/edge inspection and minimap. The canvas is capped at 300 loaded nodes.
- Evidence-backed tasks with environment, requirements, blockers, linked sessions/knowledge and audit events.
- Custom instruction profiles for AI chat. Profiles do not execute tools or act as independent beings.
- Optional OpenAI-compatible, Anthropic-compatible and Ollama chat, per-workspace history, context preview, cancellation, estimated token counts and actual provider usage when exposed.
- Official MCP SDK v2 client: approved stdio/Streamable HTTP connections, tool discovery/invocation, resources and prompts. Every sensitive request requires a native, one-time approval.
- Optional read-only MNEMO MCP stdio server restricted to one explicitly selected workspace.
- Workspace JSON export/restore, knowledge Markdown export, whole-database backup and workspace data deletion.
- Automated unit/integration/desktop tests, Windows build/release workflows, synthetic benchmarks and an MIT license.

## Run from source

Install Node.js **24.18 or newer in the 24 LTS line**, npm and Git. The exact dependencies are locked in `package-lock.json`.

```powershell
cd C:\Users\pc\OneDrive\Documents\Projects\MNEMO
npm ci
node node_modules/electron/install.js
npm run dev
```

The explicit Electron install command is idempotent and also handles npm configurations that suppress dependency install scripts. On x64 Windows, node-pty ships the tested N-API native binaries and ConPTY DLL; a local C++ compiler is unnecessary for this distribution.

```powershell
npm run check       # lint, type check, unit/integration tests, production build
npm run test:e2e    # real Electron desktop tests, isolated synthetic data
npm run benchmark  # 100 / 1,000 / 10,000 sessions and context evidence benchmark
node scripts/desktop-benchmark.mjs
npm run package    # unsigned x64 Windows NSIS installer
npm start          # open the last production build
```

`npm run dev` rebuilds the main process on startup and provides renderer hot reload. Restart it after main/preload changes.

## Storage and privacy

Data is stored in Electron's `userData` directory, normally `%APPDATA%\mnemo\mnemo.db`. The project folder is used as terminal working directory; selecting it does not crawl or upload its files. A database contains all local workspaces, with workspace-scoped queries and foreign keys. This is logical isolation, not encryption or a boundary against another process running as your Windows user.

An explicitly supplied `--data-dir=C:\absolute\folder` argument selects a separate data directory, useful for portable data or isolated testing. It does not alter permission requirements.

API keys are protected with Electron `safeStorage` (Windows OS encryption) and never returned to the renderer. Session and memory text is stored in plaintext. Known-secret redaction is best effort, not a guarantee. Review authorized imports and context. A request approval identifies its provider/server and destination. No imported text can launch commands. AI chat never invokes tools or inserts commands into a terminal.

For full backup restoration, close MNEMO, keep a copy of the existing data directory, and replace `mnemo.db` with a verified database backup. Do not restore a live WAL database by copying only its main file. Workspace JSON restoration is available in Settings and adds remapped records without overwriting existing data.

## AI configuration

- Ollama: default base `http://127.0.0.1:11434`; choose an installed chat model.
- OpenAI-compatible: base includes the API prefix, e.g. `https://api.openai.com/v1`; MNEMO appends `/chat/completions`.
- Anthropic-compatible: base `https://api.anthropic.com`; MNEMO appends `/v1/messages`.
- Optional embeddings: install your selected Ollama embedding model and authorize indexing in Settings. Semantic search separately asks permission to transmit the search query. Editing a memory invalidates its cached vector.

Authorized external provider credentials and installed local models are supplied by the user. Real paid-provider calls and semantic-model quality have not been verified with a supplied account/model. Adapter tests use mocked synthetic responses.

## Documentation

- [Architecture and database](ARCHITECTURE.md)
- [Development and troubleshooting](DEVELOPMENT.md)
- [Memory lifecycle and retrieval](MEMORY-ENGINE.md)
- [MCP integration and permissions](MCP-INTEGRATION.md)
- [Security boundaries](SECURITY.md)
- [Benchmarks and limitations](TOKEN-BENCHMARKS.md)
- [Validation evidence](VALIDATION.md)
- [Contribution process](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Remaining product work](ROADMAP.md)

MNEMO is MIT licensed. Dependencies retain their own licenses. Electron/Chromium distribution licenses are included in packaged application resources.
