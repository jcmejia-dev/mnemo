# MCP integration

MNEMO uses the official `@modelcontextprotocol/client` and `@modelcontextprotocol/server` **2.3.1** packages. Protocol behavior follows the installed SDK; unsupported capabilities return SDK errors. See the [official SDK client documentation](https://ts.sdk.modelcontextprotocol.io/v2/clients/connect).

## Client

In MCP Tools, save a server configuration, then choose **Connect**. Saving does not launch the server. A native approval shows the stdio executable/arguments or remote URL. There is no automatic connection on startup.

- Stdio servers are spawned with a deliberately small environment: PATH, SystemRoot and TEMP. Parent provider secrets are not forwarded. Choose an executable or installed command and enter arguments one per line.
- Remote servers use Streamable HTTP. HTTPS is required except loopback HTTP. Remote OAuth/token-auth setup is not currently exposed in the UI; an OAuth-protected server may fail to connect. Do not put secrets in URL credentials or config arguments.
- Discover tools to inspect descriptions and JSON input schema. Select a name, enter JSON arguments and choose **Review & authorize once**.
- Resources and prompts can be listed. Choose the Read resource/Get prompt operation, enter the URI/name, and authorize access. Prompt arguments must be string values.
- Invocation approval names the destination, operation and exact arguments (the dialog display caps very large arguments). Responses are displayed as redacted untrusted text; they cannot call a terminal or change memory themselves.
- Disconnect closes the SDK transport. Switching workspaces closes all MCP connections.

There are no permanent grants or annotation-based trust shortcuts. A server's `readOnlyHint` is informative, not proof. The user must inspect a stdio server before approving it because its process runs with the user's full OS permissions.

## Read-only MNEMO server

The optional stdio server is a source/developer tool requiring Node.js 24. It does not start with the desktop app, expose a port, or accept arbitrary workspace IDs per request.

```powershell
node dist-electron/main/mcp-server.js "C:\Users\you\AppData\Roaming\mnemo\mnemo.db" "AUTHORIZED-WORKSPACE-ID"
```

Obtain the workspace ID from a workspace JSON export's `workspace.id`. Starting this command explicitly authorizes read access to that one workspace. The database is opened with `readOnly: true`; an invalid workspace fails startup.

| Tool | Access |
|---|---|
| `mnemo.search_memory` | Bounded memory search, sources and statuses |
| `mnemo.list_sessions` | Bounded session metadata |
| `mnemo.get_debugging_lessons` | Bounded debugging knowledge |
| `mnemo.get_decisions` | Bounded technical decisions |

No mutation tool exists in this preview. Private data from another workspace is excluded in every query. MCP clients receiving evidence must treat it as untrusted reference text. Read-only MCP tools do not confer permission to run commands from a returned source.

## Verification

Tests connect the real SDK client/server using linked in-memory transports, discover tools, invoke search and verify workspace isolation. Desktop tests verify refusal prevents server startup. External third-party servers require user-authorized configuration; no private service was contacted during development.
