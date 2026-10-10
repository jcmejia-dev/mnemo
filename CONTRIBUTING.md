# Contributing

Use newly written code, public documentation, licensed dependencies and synthetic or authorized data. Never contribute private employer source, credentials, customer data or confidential conversations.

1. Create a branch for a focused change and describe its observable behavior.
2. Install the locked dependencies and run `npm run dev`.
3. Update implementation, relevant tests and matching documentation.
4. Run `npm run check` and `npm run test:e2e` on Windows.
5. For desktop/native/security changes, build and smoke-test the packaged app.
6. Submit a pull request describing the problem, resulting behavior, validation and material limitations.

Use TypeScript strict mode, bound IPC inputs, parameterized SQL and workspace-scoped access. Preserve sources and version history. No AI summary is a confirmed fact. Execution/verification statuses require observed evidence. Imported text must never grant tool or terminal permissions.

Keep UI accessible with labeled inputs, visible focus, keyboard operation and modal focus scopes. Keep renderer Node/network/credential capabilities disabled. Add dependencies only when they support real functionality; keep versions locked and document native requirements.

Report security problems through private vulnerability reporting once a public repository is configured. Do not post credentials, personal transcripts or exploit-bearing private data in issues.
