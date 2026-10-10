# Security

This is a local developer preview. A sandbox, validation and permission gates reduce exposure, but do not replace independent security review.

## Boundaries

- Renderer: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, web security enabled. No unrestricted filesystem/shell APIs are exposed. A real terminal necessarily accepts user keystrokes for an active, workspace-scoped PTY; chat/imports never call that API.
- IPC: explicit preload method allowlist, main-frame/webContents checks, bounded Zod inputs and bound SQL parameters.
- Imported transcripts, memory, repository material and MCP responses: untrusted data. Text displays as React text/pre blocks, not executable HTML. Context embeds evidence as source-bearing JSON records after an explicit untrusted-data boundary.
- AI: requires a native approval before sending. It has no tools, cannot execute code, and cannot auto-confirm memory/task execution. Cancellation and bounded responses are implemented.
- MCP: separate connection and one-time operation approvals. An approved local process is trusted by the user and runs with their OS access; it is not OS-sandboxed by MNEMO.
- Credentials: only the main process uses `safeStorage`. Encryption availability is checked; credentials are never returned to renderer or exported in workspace JSON. Changing the configured provider endpoint/kind clears its existing key unless a new one is provided.
- Workspaces: queries are scoped and cross-workspace entity links are rejected. A single local database is not an access-control boundary against another app running as the same Windows account.

## Data and logs

Memories, sessions, chat history and audit details are plaintext on disk. Known token/key/password/private-key patterns are redacted during import, memory writes, response storage and audit writes. This cannot recognize every secret format; review data before importing/exporting or authorizing transmission. Terminal output is transient xterm scrollback and may naturally show output of user-entered commands. MNEMO does not persist terminal output to SQLite.

Workspace JSON exports omit stored provider keys/configuration and chat settings, but may contain sensitive user-authored text not caught by redaction. Whole-database backups contain every workspace, plaintext conversation data and encrypted credential blobs. OS-protected keys may be unusable on a different account/machine. Keep backups private and verify restore before relying on them.

Deletion cascades workspace records/settings and checkpoints/vacuums SQLite. It is logical deletion, not a guarantee of secure erasure from SSDs, filesystem snapshots, OneDrive, backup copies or operating-system caches. Deleting a MNEMO workspace never deletes project files.

Startup diagnostics contain fixed lifecycle messages and startup failure text. Application audit entries record action/entity metadata and redacted details; API response bodies on failed requests and provider credentials are not logged.

## Network and supply chain

AI/embedding endpoints require HTTPS except local loopback HTTP, reject embedded URL credentials, and reject HTTP redirects. Responses are bounded and time-limited. MCP transport/network behavior is managed by the SDK after server approval. MCP responses and child-server code can still be malicious; tool annotations are not trusted permissions.

Dependencies are pinned with a lockfile. The `global-agent` override removes a vulnerable transitive installer dependency. Runtime and development dependency audits should be rerun at release time. Windows native node-pty prebuilds are N-API binaries tested under the pinned Electron version; packaging skips unnecessary ABI rebuilds. New platform/Electron/native dependency changes require packaged-app terminal tests.

## Report a vulnerability

For a public repository deployment, enable GitHub private vulnerability reporting and submit reports there. Until a repository/security contact is configured, do not publish exploit details or sensitive logs in public issues. Include affected version, reproduction steps and scope without credentials or private transcripts. No invented security contact is provided.

## Known areas for review

Independent review of IPC, credential lifetime, malicious exports, stdio process trust, network configuration, data deletion and installer distribution remains necessary before a production designation. The preview has no automatic update channel, telemetry or background cloud synchronization.
