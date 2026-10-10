# Product scope and remaining work

The 0.1.0 preview delivers a real desktop foundation and usable core workflows across the six requested milestones. It does not represent every advanced requirement as complete.

| Milestone | Delivered foundation | Remaining production work |
|---|---|---|
| 1 — Desktop foundation | Real Electron app, terminal, SQLite, workspaces, authorized imports | Named/custom terminal profiles, per-command shell integration/status, additional Windows-version coverage |
| 2 — Persistent knowledge | Memory CRUD, provenance, revisions, FTS, local proposals, manual conflicts | More import adapters, semantic extraction/contradiction proposals with review, cross-session recurrence detection |
| 3 — Context intelligence | Ranked keyword/relationships, optional Ollama vectors, whole-record budgeting, exclusions/pins, diagnostics | Exact model tokenizers, summary quality evaluation, approximate vector index, prompt-template library, retrieval caching |
| 4 — Graph | Actual stored edges, bounded canvas, focus/filter/inspection/minimap | Full graph clustering, relationship-aware automatic layout, virtualized large lists, broader graph categories |
| 5 — AI/MCP | Three adapters, persisted chat/profiles, explicit client permissions, four read-only server tools | Authenticated remote MCP/OAuth UI, richer editable profile policies/templates, approved mutation MCP tools, streaming responses |
| 6 — Production quality | Unit/integration/desktop tests, security boundaries, docs, synthetic measurements, installer and CI YAML | Independent security audit, clean-machine installer/uninstall trials, paid/local-model quality evaluations, public CI execution, release identity/signing/update policy |

Additional limits: archive restore and preview parsing run synchronously with explicit size limits; retrieval is synchronous and can briefly block main for large histories. Session search uses bounded LIKE joins, not a separate transcript FTS index. Session/memory lists paginate rather than fully virtualize. Task attempts are represented by saved statuses/evidence and audit events, with no automatic command-to-task verification. Memory conflict detection surfaces stored contradiction edges; it does not automatically decide which factual claim is correct.

External dependencies are user-authorized model endpoints/API keys, installed Ollama models, approved MCP servers, and a chosen public GitHub repository for running/publishing CI. No private service, paid provider, repository publication, installer signing or release publishing was fabricated.
