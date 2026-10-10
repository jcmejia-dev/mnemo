import { contextBridge, ipcRenderer } from "electron";
import type { TerminalEvent } from "../shared/types.js";
const methods = new Set([
  "snapshot",
  "workspace.add",
  "workspace.select",
  "workspace.environment",
  "workspace.delete",
  "session.preview",
  "session.commit",
  "session.list",
  "session.get",
  "session.extract",
  "memory.save",
  "memory.list",
  "memory.revisions",
  "memory.merge",
  "relationship.add",
  "relationship.delete",
  "context.retrieve",
  "context.copy",
  "context.embed",
  "task.save",
  "profile.save",
  "settings.save",
  "provider.save",
  "chat.send",
  "chat.cancel",
  "chat.history",
  "mcp.save",
  "mcp.connect",
  "mcp.disconnect",
  "mcp.tools",
  "mcp.invoke",
  "mcp.resources",
  "mcp.read",
  "mcp.prompts",
  "mcp.prompt",
  "import.archive",
  "export.json",
  "export.markdown",
  "export.backup",
  "terminal.create",
  "terminal.write",
  "terminal.resize",
  "terminal.close",
]);
contextBridge.exposeInMainWorld("mnemo", {
  call: (method: string, args: unknown) => {
    if (!methods.has(method))
      return Promise.reject(new Error("Unsupported operation."));
    return ipcRenderer.invoke("mnemo:call", method, args);
  },
  onTerminal: (callback: (event: TerminalEvent) => void) => {
    const listener = (_event: unknown, data: TerminalEvent) => callback(data);
    ipcRenderer.on("mnemo:terminal", listener);
    return () => ipcRenderer.removeListener("mnemo:terminal", listener);
  },
});
