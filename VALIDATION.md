# Validation evidence

Local environment: Windows 10 build 19045 x64, Node 24.18.0, Electron 44.7.0, synthetic temporary workspaces. Date: 10 October 2026.

## Automated results

- **ESLint:** passed.
- **TypeScript:** strict main and renderer targets passed.
- **Vitest:** 32 tests passed in three files.
- **Desktop E2E:** four tests passed against actual Electron.
- **Production build:** passed; graph and terminal split into lazy chunks.
- **Dependency audit:** zero known vulnerabilities at the recorded local install, including development dependencies.
- **Benchmarks:** 100/1,000/10,000 session/memory runs and bounded graph runs recorded as JSON with methodology.
- **Windows NSIS packaging:** an unsigned x64 installer was built locally.
- **Packaged executable smoke:** passed against both the unpacked distribution and the executable installed by NSIS. Each used an isolated data directory and verified real PowerShell output.
- **Local installer trial:** silent installation and uninstallation both completed with exit code 0 in an isolated workspace folder. The installed executable ran the packaged terminal smoke test, and uninstall removed it. Clean-VM and Windows 11 testing remain separate.

## Coverage

Unit/integration tests verify supported/unsupported imports, duplicate handling, append-only evidence, atomic rejection, known-secret redaction, extraction/noise rejection, proposal approval, version snapshots, FTS updates, archival exclusion, export/restore remapping, transactions, migration reopening, Drizzle queries, workspace isolation, graph endpoint enforcement, contradictions, pins/exclusions, semantic cosine caches, estimated budgets, task evidence enforcement, provider parsing/errors, endpoint restrictions and official MCP discovery/invocation.

Desktop tests verify:

1. Memory creation, retrieval, actual graph nodes, real PowerShell output, persistence after restart and renderer isolation/sandbox flags.
2. Rejected approval prevents MCP startup and AI transmission.
3. Empty verification evidence and non-allowlisted filesystem IPC are rejected.
4. Reviewed import commits in a worker, extraction creates Proposed knowledge, and duplicate import skips indexing.

Packaged smoke launches the real distributed executable with an isolated `--data-dir`, opens a workspace and verifies a native PowerShell command's output. It does not rely on installed developer node_modules. Installer install/uninstall on a clean VM is separate and has not been performed.

## Not claimed

No paid-provider requests, installed Ollama model evaluations, third-party MCP account access, Windows 11 trial, clean-machine installer/uninstaller test, public GitHub Actions run, public release, certificate signing, external penetration test or model answer-quality benchmark occurred. The optional read-only MCP server was tested with the real SDK using in-memory transports; it has not been advertised as exposing mutation tools.

All screenshots are captured from the running application with synthetic data. No design mockup stands in for functionality. The full requested production standard still requires the work tracked in ROADMAP.md.
