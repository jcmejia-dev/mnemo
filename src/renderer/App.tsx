import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Boxes,
  TerminalSquare,
  MessagesSquare,
  BrainCircuit,
  Network,
  Bot,
  Plug,
  Activity,
  Settings,
  Plus,
  FolderOpen,
  Search,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  FileText,
  Check,
  Copy,
  X,
  Download,
  Clock,
  Command,
  PanelRightClose,
  PanelRightOpen,
  GitBranch,
  CheckCircle2,
} from "lucide-react";
import {
  memoryTypes,
  statuses,
  taskStatuses,
  type Snapshot,
  type Memory,
  type MemoryInput,
  type Session,
  type Bundle,
  type ImportPreview,
  type Message,
  type ProviderConfig,
  type Task,
} from "../shared/types";
const TerminalView = lazy(() =>
  import("./Terminal").then((module) => ({ default: module.TerminalView })),
);
const Graph = lazy(() =>
  import("./Graph").then((module) => ({ default: module.Graph })),
);
import { FocusScope } from "@radix-ui/react-focus-scope";
import { motion } from "motion/react";
const navigation = [
  ["Workspace", Boxes],
  ["Terminal", TerminalSquare],
  ["Sessions", MessagesSquare],
  ["Memory", BrainCircuit],
  ["Knowledge Graph", Network],
  ["Agents", Bot],
  ["MCP Tools", Plug],
  ["Activity", Activity],
  ["Settings", Settings],
] as const;
const newMemory: MemoryInput = {
  title: "",
  content: "",
  type: "Technical Decision",
  status: "Proposed",
  source: "User-authored",
  tags: [],
};
function date(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={"badge " + String(children).toLowerCase().replace(/\s/g, "-")}
    >
      {children}
    </span>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <BrainCircuit size={36} />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function App() {
  const [data, setData] = useState<Snapshot | null>(null),
    [page, setPage] = useState("Workspace"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState(0),
    [right, setRight] = useState(true),
    [selected, setSelected] = useState<Memory | null>(null),
    [draft, setDraft] = useState<MemoryInput | null>(null),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [sessions, setSessions] = useState<Session[]>([]),
    [query, setQuery] = useState(""),
    [memoryQuery, setMemoryQuery] = useState(""),
    [memoryFilter, setMemoryFilter] = useState("All"),
    [revisions, setRevisions] = useState<
      { version: number; snapshot: string; createdAt: string }[]
    >([]);
  const [contextQuery, setContextQuery] = useState(""),
    [budget, setBudget] = useState(2000),
    [bundle, setBundle] = useState<Bundle | null>(null),
    [pinned, setPinned] = useState<string[]>([]),
    [excluded, setExcluded] = useState<string[]>([]),
    [semantic, setSemantic] = useState(false);
  const [chat, setChat] = useState<Message[]>([]),
    [chatInput, setChatInput] = useState(""),
    [chatBusy, setChatBusy] = useState(false),
    [profileId, setProfileId] = useState(""),
    [usage, setUsage] = useState("");
  const [mcpDraft, setMcpDraft] = useState({
      name: "",
      transport: "stdio",
      command: "",
      args: "",
      url: "",
    }),
    [toolResult, setToolResult] = useState(""),
    [tools, setTools] = useState<
      { name: string; description?: string; inputSchema?: unknown }[]
    >([]),
    [serverId, setServerId] = useState(""),
    [toolName, setToolName] = useState(""),
    [toolArgs, setToolArgs] = useState("{}"),
    [mcpOperation, setMcpOperation] = useState("mcp.invoke");
  const [taskDraft, setTaskDraft] = useState<Partial<Task> | null>(null),
    [agentDraft, setAgentDraft] = useState<{
      name: string;
      instructions: string;
      verification: string;
    } | null>(null),
    [providerDraft, setProviderDraft] = useState<ProviderConfig | null>(null),
    [apiKey, setApiKey] = useState(""),
    [embeddingModel, setEmbeddingModel] = useState("nomic-embed-text"),
    [embeddingEndpoint, setEmbeddingEndpoint] = useState(
      "http://127.0.0.1:11434",
    );
  const report = useCallback(
    (value: unknown) =>
      setError(value instanceof Error ? value.message : String(value)),
    [],
  );
  const refresh = useCallback(async () => {
    const snapshot = await window.mnemo.call<Snapshot>("snapshot");
    setData(snapshot);
    setSessions(snapshot.sessions);
    return snapshot;
  }, []);
  const run = useCallback(
    async <T,>(
      method: string,
      args?: unknown,
      refreshAfter = true,
    ): Promise<T | undefined> => {
      setPending((n) => n + 1);
      setError("");
      try {
        const result = await window.mnemo.call<T>(method, args);
        if (refreshAfter) await refresh();
        return result;
      } catch (value) {
        report(value);
      } finally {
        setPending((n) => n - 1);
      }
    },
    [refresh, report],
  );
  useEffect(() => {
    void refresh().catch(report);
  }, [refresh, report]);
  useEffect(() => {
    if (!data?.workspace) return;
    const timer = setTimeout(() => {
      void window.mnemo
        .call<Session[]>("session.list", { query })
        .then(setSessions)
        .catch(report);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, data?.workspace?.id, report]);
  useEffect(() => {
    setSelected(null);
    setSession(null);
    setBundle(null);
    setPinned([]);
    setExcluded([]);
    setChat([]);
    setTools([]);
    setServerId("");
    setProviderDraft(null);
    if (data?.workspace)
      void window.mnemo
        .call<Message[]>("chat.history")
        .then(setChat)
        .catch(report);
  }, [data?.workspace?.id, report]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === ",") {
        event.preventDefault();
        setPage("Settings");
      }
      if (event.ctrlKey && event.key === "1") {
        event.preventDefault();
        setPage("Terminal");
      }
      if (event.key === "Escape") {
        setDraft(null);
        setPreview(null);
        setTaskDraft(null);
        setAgentDraft(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  async function openMemory(memory: Memory) {
    setSelected(memory);
    setRevisions([]);
    const result = await run<typeof revisions>(
      "memory.revisions",
      { id: memory.id },
      false,
    );
    if (result) setRevisions(result);
  }
  async function retrieve() {
    const result = await run<Bundle>(
      "context.retrieve",
      { query: contextQuery, budget, pinned, excluded, semantic },
      false,
    );
    if (result) setBundle(result);
  }
  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!chatInput.trim() || chatBusy) return;
    setChatBusy(true);
    const prompt = chatInput;
    const result = await run<{ text: string; usage: unknown }>("chat.send", {
      message: prompt,
      context: bundle?.text ?? "",
      profileId: profileId || undefined,
    });
    if (result) {
      setChat((c) => [
        ...c,
        { role: "user", content: prompt },
        { role: "assistant", content: result.text },
      ]);
      setChatInput("");
      setUsage(JSON.stringify(result.usage ?? "Provider did not expose usage"));
    }
    setChatBusy(false);
  }
  async function saveMemory(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const result = await run<Memory>("memory.save", draft);
    if (result) {
      setDraft(null);
      setSelected(result);
      setNotice("Memory saved with revision history.");
    }
  }
  async function exportData(method: string) {
    const result = await run<string>(method);
    if (result) setNotice(`Saved: ${result}`);
  }
  if (!data)
    return (
      <div className="boot">
        <BrainCircuit size={36} />
        <h1>MNEMO</h1>
        <p>{error || "Opening your local workspace…"}</p>
      </div>
    );
  const workspace = data.workspace;
  const filteredMemories = data.memories.filter(
    (m) =>
      (memoryFilter === "All" || m.status === memoryFilter) &&
      `${m.title} ${m.content} ${m.tags.join(" ")}`
        .toLowerCase()
        .includes(memoryQuery.toLowerCase()),
  );
  const provider = providerDraft ?? data.provider;
  return (
    <div className={"app " + (data.settings.theme === "light" ? "light" : "")}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BrainCircuit size={22} />
          </div>
          <strong>
            mnemo<span> / </span>
          </strong>
          <small>LOCAL</small>
        </div>
        <div className="workspace-picker">
          <span className="eyebrow">WORKSPACE</span>
          <select
            aria-label="Active workspace"
            value={workspace?.id ?? ""}
            onChange={(event) =>
              void run("workspace.select", { id: event.target.value })
            }
          >
            <option value="" disabled>
              Select a project
            </option>
            {data.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            aria-label="Add workspace"
            onClick={() => void run("workspace.add")}
          >
            <Plus size={15} />
          </button>
        </div>
        <nav>
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "selected" : ""}
              onClick={() => setPage(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Memory" && <small>{data.counts.memories}</small>}
              {name === "Sessions" && <small>{data.counts.sessions}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <span className="dot green" /> Local storage active
          </div>
          <span>v0.1.0 · Developer preview</span>
          <p>
            Your knowledge stays on this device.
            <br />
            External requests require approval.
          </p>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="breadcrumb">
            {workspace?.name ?? "Your workspace"} <ChevronRight size={14} />{" "}
            <strong>{page}</strong>
          </span>
          <span className="spacer" />
          {workspace && (
            <select
              className={"environment " + workspace.environment.toLowerCase()}
              aria-label="Active environment"
              value={workspace.environment}
              onChange={(event) =>
                void run("workspace.environment", {
                  environment: event.target.value,
                })
              }
            >
              {["Local", "Development", "Test", "Staging", "Production"].map(
                (e) => (
                  <option key={e}>{e}</option>
                ),
              )}
            </select>
          )}
          <span className="local-label">
            <ShieldCheck size={14} /> Local-first
          </span>
          <button
            className="icon-button"
            aria-label="Toggle context panel"
            onClick={() => setRight(!right)}
          >
            {right ? (
              <PanelRightClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
        </header>
        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={"notification " + (error ? "error" : "")}
          >
            <span>{error || notice}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => {
                setError("");
                setNotice("");
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="body-columns">
          <main className="content">
            <Suspense
              fallback={<p className="page-pad muted">Opening local tools…</p>}
            >
              {!workspace ? (
                <motion.div
                  className="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="eyebrow">
                    INTELLIGENT DEVELOPER WORKSPACE
                  </span>
                  <h1>
                    Keep the discoveries.
                    <br />
                    Move the work forward.
                  </h1>
                  <p>
                    A local terminal, persistent project knowledge, and context
                    <br />
                    that comes with its sources. Start with a project folder.
                  </p>
                  <button
                    className="primary"
                    onClick={() => void run("workspace.add")}
                  >
                    <FolderOpen size={17} /> Open a workspace
                  </button>
                  <div className="welcome-details">
                    <span>
                      <TerminalSquare /> Real PowerShell
                    </span>
                    <span>
                      <BrainCircuit /> Persistent memory
                    </span>
                    <span>
                      <Network /> Connected knowledge
                    </span>
                  </div>
                </motion.div>
              ) : (
                <>
                  {page === "Workspace" && (
                    <div className="page-pad">
                      <div className="page-heading">
                        <div>
                          <span className="eyebrow">WORKSPACE OVERVIEW</span>
                          <h1>{workspace.name}</h1>
                          <p className="path">{workspace.path}</p>
                        </div>
                        <button onClick={() => setPage("Terminal")}>
                          <TerminalSquare size={16} /> Open terminal{" "}
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <div className="stats-grid">
                        <div>
                          <MessagesSquare />
                          <strong>{data.counts.sessions}</strong>
                          <span>Imported sessions</span>
                        </div>
                        <div>
                          <BrainCircuit />
                          <strong>{data.counts.memories}</strong>
                          <span>Persistent memories</span>
                        </div>
                        <div>
                          <CheckCircle2 />
                          <strong>
                            {
                              data.memories.filter(
                                (m) => m.status === "Confirmed",
                              ).length
                            }
                          </strong>
                          <span>Confirmed in loaded page</span>
                        </div>
                        <div>
                          <GitBranch />
                          <strong>{data.relationships.length}</strong>
                          <span>Stored relationships</span>
                        </div>
                      </div>
                      <div className="section-heading">
                        <h2>Continue your work</h2>
                        <button
                          onClick={() =>
                            setTaskDraft({
                              objective: "",
                              requirements: "",
                              environment: workspace.environment,
                              status: "Prepared",
                              evidence: "",
                              blockers: "",
                              sessionId: null,
                              memoryIds: [],
                            })
                          }
                        >
                          <Plus size={15} /> New task
                        </button>
                      </div>
                      {!data.tasks.length ? (
                        <div className="callout">
                          <Command size={22} />
                          <div>
                            <strong>Make progress traceable</strong>
                            <p>
                              Track an objective, record observed results, and
                              verify with evidence.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="task-list">
                          {data.tasks.map((task) => (
                            <button
                              key={task.id}
                              className="task-card"
                              onClick={() => setTaskDraft(task)}
                            >
                              <span>
                                <Badge>{task.status}</Badge>
                                <strong>{task.objective}</strong>
                                <small>
                                  {task.environment} · {date(task.updatedAt)}
                                </small>
                              </span>
                              <ChevronRight size={16} />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="section-heading">
                        <h2>Recent knowledge</h2>
                        <button onClick={() => setPage("Memory")}>
                          View all <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <div className="memory-grid">
                        {data.memories.slice(0, 4).map((memory) => (
                          <button
                            className="memory-card"
                            key={memory.id}
                            onClick={() => void openMemory(memory)}
                          >
                            <div>
                              <Badge>{memory.status}</Badge>
                              <small>{memory.type}</small>
                            </div>
                            <h3>{memory.title}</h3>
                            <p>{memory.content.slice(0, 140)}</p>
                            <footer>
                              <FileText size={12} />
                              {memory.source.slice(0, 42)}
                            </footer>
                          </button>
                        ))}
                      </div>
                      {!data.memories.length && (
                        <div className="callout">
                          <BrainCircuit size={22} />
                          <div>
                            <strong>Your project memory starts here</strong>
                            <p>
                              Import a conversation or write a decision. Every
                              memory retains its source.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setPage("Memory");
                              setDraft({ ...newMemory });
                            }}
                          >
                            Add memory
                          </button>
                        </div>
                      )}
                      <div className="section-heading">
                        <h2>AI workspace</h2>
                        <span className="muted">
                          {data.provider.kind} / {data.provider.model}
                        </span>
                      </div>
                      {data.usage && (
                        <div className="usage-dashboard">
                          <h3>
                            Last AI request · {data.usage.provider} /{" "}
                            {data.usage.model}
                          </h3>
                          <div className="context-metrics">
                            <div>
                              <strong>{data.usage.estimatedInputTokens}</strong>
                              <span>estimated input tokens</span>
                            </div>
                            <div>
                              <strong>
                                {data.usage.estimatedOutputTokens}
                              </strong>
                              <span>estimated output tokens</span>
                            </div>
                            <div>
                              <strong>{data.usage.contextTokens}</strong>
                              <span>context tokens</span>
                            </div>
                          </div>
                          <p className="mono muted">
                            Actual API usage:{" "}
                            {JSON.stringify(
                              data.usage.actual ?? "Not exposed by provider",
                            )}
                          </p>
                        </div>
                      )}
                      <div className="chat-thread">
                        {chat.length === 0 ? (
                          <p className="muted">
                            Optional AI assistance. Review the context at right
                            before sending. Local tools work without a provider.
                          </p>
                        ) : (
                          chat.map((m, index) => (
                            <article
                              key={index}
                              className={"chat-message " + m.role}
                            >
                              <span className="eyebrow">{m.role}</span>
                              <pre>{m.content}</pre>
                            </article>
                          ))
                        )}
                      </div>
                      <form
                        className="chat-form"
                        onSubmit={(event) => void sendChat(event)}
                      >
                        <textarea
                          aria-label="AI message"
                          placeholder="Describe your task…"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          rows={3}
                        />
                        <div>
                          <select
                            aria-label="Instruction profile"
                            value={profileId}
                            onChange={(e) => setProfileId(e.target.value)}
                          >
                            <option value="">
                              Default instruction profile
                            </option>
                            {data.profiles.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <span className="spacer" />
                          {chatBusy ? (
                            <button
                              type="button"
                              onClick={() => void run("chat.cancel", {}, false)}
                            >
                              Cancel request
                            </button>
                          ) : (
                            <button
                              className="primary"
                              disabled={!chatInput.trim()}
                              type="submit"
                            >
                              Review & send <ArrowUpRight size={14} />
                            </button>
                          )}
                        </div>
                      </form>
                      {usage && (
                        <p className="mono muted">
                          Actual provider usage: {usage}
                        </p>
                      )}
                    </div>
                  )}
                  <div
                    className="terminal-page"
                    style={{ display: page === "Terminal" ? "flex" : "none" }}
                  >
                    <TerminalView
                      key={workspace.id}
                      workspaceId={workspace.id}
                      cwd={workspace.path}
                      settings={data.settings}
                      report={report}
                    />
                  </div>
                  {page === "Sessions" && (
                    <div className="page-pad">
                      <div className="page-heading">
                        <div>
                          <span className="eyebrow">
                            YOUR DEVELOPMENT HISTORY
                          </span>
                          <h1>Sessions</h1>
                          <p>
                            Authorized imports. Original evidence, preserved
                            locally.
                          </p>
                        </div>
                        <button
                          className="primary"
                          onClick={() =>
                            void run<ImportPreview | null>(
                              "session.preview",
                              {},
                              false,
                            ).then((value) => {
                              if (value) setPreview(value);
                            })
                          }
                        >
                          <Plus size={16} /> Import session
                        </button>
                      </div>
                      <div className="toolbar">
                        <Search size={16} />
                        <input
                          aria-label="Search sessions"
                          placeholder="Search titles and transcript content…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        <span className="muted">
                          {sessions.length} loaded / {data.counts.sessions}
                        </span>
                      </div>
                      <div className="session-layout">
                        <div className="session-list">
                          {sessions.map((s) => (
                            <button
                              key={s.id}
                              className={
                                "session-row " +
                                (session?.id === s.id ? "active" : "")
                              }
                              onClick={() =>
                                void run<Session>(
                                  "session.get",
                                  { id: s.id },
                                  false,
                                ).then((value) => {
                                  if (value) setSession(value);
                                })
                              }
                            >
                              <MessagesSquare size={18} />
                              <span>
                                <strong>{s.title}</strong>
                                <small>
                                  {s.provider} · {s.messageCount} messages ·{" "}
                                  {date(s.updatedAt)}
                                </small>
                                <small>{s.source}</small>
                              </span>
                              <ChevronRight size={14} />
                            </button>
                          ))}
                          {!sessions.length && (
                            <Empty title="No sessions yet">
                              Import JSON, Markdown or plain text from
                              conversations you own.
                            </Empty>
                          )}
                          <button
                            onClick={() =>
                              void window.mnemo
                                .call<Session[]>("session.list", {
                                  query,
                                  offset: sessions.length,
                                })
                                .then((next) =>
                                  setSessions((s) => [...s, ...next]),
                                )
                                .catch(report)
                            }
                          >
                            Load next 100
                          </button>
                        </div>
                        {session && (
                          <div className="transcript">
                            <div className="section-heading">
                              <h2>{session.title}</h2>
                              <button
                                onClick={() =>
                                  void run<{ proposed: number }>(
                                    "session.extract",
                                    { id: session.id },
                                  ).then((result) => {
                                    if (result)
                                      setNotice(
                                        `${result.proposed} memory proposals created. Review them in Memory.`,
                                      );
                                  })
                                }
                              >
                                <BrainCircuit size={15} /> Propose memories
                              </button>
                            </div>
                            <p className="muted">
                              Untrusted source · {session.source} · created{" "}
                              {date(session.createdAt)}
                            </p>
                            {session.summary && (
                              <details>
                                <summary>Unverified extractive summary</summary>
                                <pre>{session.summary}</pre>
                              </details>
                            )}
                            {session.messages?.map((m, index) => (
                              <article
                                className="transcript-message"
                                key={index}
                              >
                                <span className="eyebrow">
                                  {m.role} · message {index}
                                </span>
                                <pre>{m.content}</pre>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {page === "Memory" && (
                    <div className="page-pad">
                      <div className="page-heading">
                        <div>
                          <span className="eyebrow">
                            PERSISTENT PROJECT KNOWLEDGE
                          </span>
                          <h1>Memory</h1>
                          <p>Keep what matters. Verify what you rely on.</p>
                        </div>
                        <button
                          className="primary"
                          onClick={() => setDraft({ ...newMemory })}
                        >
                          <Plus size={16} /> New memory
                        </button>
                      </div>
                      <div className="toolbar">
                        <Search size={16} />
                        <input
                          aria-label="Search memories"
                          placeholder="Filter loaded memories…"
                          value={memoryQuery}
                          onChange={(e) => setMemoryQuery(e.target.value)}
                        />
                        <select
                          aria-label="Memory status filter"
                          value={memoryFilter}
                          onChange={(e) => setMemoryFilter(e.target.value)}
                        >
                          {["All", ...statuses].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="memory-grid">
                        {filteredMemories.map((memory) => (
                          <button
                            className="memory-card"
                            key={memory.id}
                            onClick={() => void openMemory(memory)}
                          >
                            <div>
                              <Badge>{memory.status}</Badge>
                              <small>{memory.type}</small>
                            </div>
                            <h3>{memory.title}</h3>
                            <p>{memory.content.slice(0, 180)}</p>
                            <footer>
                              <FileText size={12} />
                              {memory.source.slice(0, 48)}
                              <span className="spacer" />v{memory.version}
                            </footer>
                          </button>
                        ))}
                      </div>
                      {!filteredMemories.length && (
                        <Empty title="Knowledge with a source">
                          Add a decision, a procedure, or a lesson learned.
                          Imported extraction stays Proposed until you confirm
                          it.
                        </Empty>
                      )}
                      <div className="section-heading">
                        <span className="muted">
                          {data.memories.length} loaded / {data.counts.memories}{" "}
                          total
                        </span>
                        <button
                          onClick={() =>
                            void window.mnemo
                              .call<Memory[]>("memory.list", {
                                offset: data.memories.length,
                              })
                              .then((next) =>
                                setData((d) =>
                                  d
                                    ? {
                                        ...d,
                                        memories: [...d.memories, ...next],
                                      }
                                    : d,
                                ),
                              )
                              .catch(report)
                          }
                        >
                          Load next 500
                        </button>
                      </div>
                      <details className="relation-editor">
                        <summary>Connect knowledge</summary>
                        <RelationForm
                          data={data}
                          save={(args) => void run("relationship.add", args)}
                        />
                      </details>
                    </div>
                  )}
                  {page === "Knowledge Graph" && (
                    <Graph
                      data={data}
                      onMemory={(memory) => void openMemory(memory)}
                    />
                  )}
                  {page === "Agents" && (
                    <div className="page-pad">
                      <div className="page-heading">
                        <div>
                          <span className="eyebrow">
                            REUSABLE INSTRUCTION PROFILES
                          </span>
                          <h1>Agent workspaces</h1>
                          <p>
                            Configure a role, standards and verification
                            requirements.
                          </p>
                        </div>
                        <button
                          className="primary"
                          onClick={() =>
                            setAgentDraft({
                              name: "",
                              instructions: "",
                              verification: "",
                            })
                          }
                        >
                          <Plus size={16} /> New profile
                        </button>
                      </div>
                      <div className="memory-grid">
                        {data.profiles.map((profile) => (
                          <div className="profile-card" key={profile.id}>
                            <Bot size={24} />
                            <h3>{profile.name}</h3>
                            <pre>{profile.instructions}</pre>
                            <p className="muted">
                              Verification: {profile.verification}
                            </p>
                          </div>
                        ))}
                      </div>
                      {!data.profiles.length && (
                        <Empty title="A workspace for each kind of work">
                          Create profiles for code review, documentation, or
                          debugging. Profiles supply instructions; chat has no
                          automatic tool execution.
                        </Empty>
                      )}
                    </div>
                  )}
                  {page === "MCP Tools" && (
                    <div className="page-pad">
                      <div className="page-heading">
                        <div>
                          <span className="eyebrow">
                            EXPLICITLY AUTHORIZED TOOLS
                          </span>
                          <h1>MCP connections</h1>
                          <p>
                            Connect servers you trust. Review every invocation.
                          </p>
                        </div>
                      </div>
                      <div className="server-list">
                        {data.mcp.map((server) => (
                          <div className="server-card" key={server.id}>
                            <Plug size={20} />
                            <div>
                              <strong>{server.name}</strong>
                              <p>
                                {server.transport === "stdio"
                                  ? server.command
                                  : server.url}
                              </p>
                            </div>
                            <Badge>{server.status ?? "Disconnected"}</Badge>
                            <button
                              onClick={() => {
                                setServerId(server.id);
                                void run("mcp.connect", { id: server.id }).then(
                                  (result) => {
                                    if (result)
                                      setNotice(
                                        "Server connected. Discover tools below.",
                                      );
                                  },
                                );
                              }}
                            >
                              Connect
                            </button>
                            <button
                              onClick={() =>
                                void run("mcp.disconnect", { id: server.id })
                              }
                            >
                              Disconnect
                            </button>
                          </div>
                        ))}
                      </div>
                      <details
                        open={!data.mcp.length}
                        className="panel-section"
                      >
                        <summary>Add an MCP server</summary>
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run("mcp.save", {
                              ...mcpDraft,
                              args: mcpDraft.args.split("\n").filter(Boolean),
                            }).then((result) => {
                              if (result)
                                setMcpDraft({
                                  name: "",
                                  transport: "stdio",
                                  command: "",
                                  args: "",
                                  url: "",
                                });
                            });
                          }}
                        >
                          <Field label="Server name">
                            <input
                              required
                              value={mcpDraft.name}
                              onChange={(e) =>
                                setMcpDraft({
                                  ...mcpDraft,
                                  name: e.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Transport">
                            <select
                              value={mcpDraft.transport}
                              onChange={(e) =>
                                setMcpDraft({
                                  ...mcpDraft,
                                  transport: e.target.value,
                                })
                              }
                            >
                              <option value="stdio">Local stdio</option>
                              <option value="http">
                                Remote Streamable HTTP
                              </option>
                            </select>
                          </Field>
                          {mcpDraft.transport === "stdio" ? (
                            <>
                              <Field label="Executable path or command">
                                <input
                                  required
                                  value={mcpDraft.command}
                                  onChange={(e) =>
                                    setMcpDraft({
                                      ...mcpDraft,
                                      command: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Arguments — one per line">
                                <textarea
                                  value={mcpDraft.args}
                                  onChange={(e) =>
                                    setMcpDraft({
                                      ...mcpDraft,
                                      args: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                            </>
                          ) : (
                            <Field label="Server URL">
                              <input
                                required
                                value={mcpDraft.url}
                                onChange={(e) =>
                                  setMcpDraft({
                                    ...mcpDraft,
                                    url: e.target.value,
                                  })
                                }
                              />
                            </Field>
                          )}
                          <button type="submit">Save server</button>
                        </form>
                      </details>
                      <div className="section-heading">
                        <h2>Inspect & invoke</h2>
                      </div>
                      <div className="toolbar">
                        <select
                          aria-label="MCP server"
                          value={serverId}
                          onChange={(e) => setServerId(e.target.value)}
                        >
                          <option value="">Select a server</option>
                          {data.mcp.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={!serverId}
                          onClick={() =>
                            void run<{ tools: typeof tools }>(
                              "mcp.tools",
                              { id: serverId },
                              false,
                            ).then((result) => {
                              if (result) setTools(result.tools);
                            })
                          }
                        >
                          Discover tools
                        </button>
                        <button
                          disabled={!serverId}
                          onClick={() =>
                            void run(
                              "mcp.resources",
                              { id: serverId },
                              false,
                            ).then((result) =>
                              setToolResult(JSON.stringify(result, null, 2)),
                            )
                          }
                        >
                          Resources
                        </button>
                        <button
                          disabled={!serverId}
                          onClick={() =>
                            void run(
                              "mcp.prompts",
                              { id: serverId },
                              false,
                            ).then((result) =>
                              setToolResult(JSON.stringify(result, null, 2)),
                            )
                          }
                        >
                          Prompts
                        </button>
                      </div>
                      {tools.map((tool) => (
                        <button
                          className="tool-row"
                          key={tool.name}
                          onClick={() => {
                            setToolName(tool.name);
                            setToolResult(
                              JSON.stringify(tool.inputSchema, null, 2),
                            );
                          }}
                        >
                          <strong>{tool.name}</strong>
                          <span>{tool.description}</span>
                        </button>
                      ))}
                      <Field label="Operation">
                        <select
                          value={mcpOperation}
                          onChange={(e) => setMcpOperation(e.target.value)}
                        >
                          <option value="mcp.invoke">Invoke tool</option>
                          <option value="mcp.read">Read resource</option>
                          <option value="mcp.prompt">Get prompt</option>
                        </select>
                      </Field>
                      <Field label="Tool / prompt name, or resource URI">
                        <input
                          value={toolName}
                          onChange={(e) => setToolName(e.target.value)}
                        />
                      </Field>
                      <Field label="Arguments (JSON)">
                        <textarea
                          className="mono"
                          value={toolArgs}
                          onChange={(e) => setToolArgs(e.target.value)}
                        />
                      </Field>
                      <button
                        disabled={!serverId || !toolName}
                        onClick={() => {
                          try {
                            void run<string>(
                              mcpOperation,
                              {
                                id: serverId,
                                name: toolName,
                                arguments: JSON.parse(toolArgs),
                              },
                              false,
                            ).then((result) => {
                              if (result) setToolResult(result);
                            });
                          } catch (value) {
                            report(value);
                          }
                        }}
                      >
                        Review & authorize once
                      </button>
                      <pre className="result-block">
                        {toolResult ||
                          "Server responses appear here as untrusted text."}
                      </pre>
                    </div>
                  )}
                  {page === "Activity" && (
                    <div className="page-pad">
                      <div className="page-heading">
                        <div>
                          <span className="eyebrow">
                            TRACEABLE LOCAL ACTIONS
                          </span>
                          <h1>Activity</h1>
                          <p>
                            Recent audit events in this workspace. No
                            credentials are logged.
                          </p>
                        </div>
                      </div>
                      <div className="audit-list">
                        {data.audit.map((a) => (
                          <div key={a.id}>
                            <Clock size={16} />
                            <span>
                              <strong>{a.action}</strong>
                              <p>{a.detail}</p>
                              <small className="mono">{a.entityId}</small>
                            </span>
                            <time>
                              {new Date(a.createdAt).toLocaleString()}
                            </time>
                          </div>
                        ))}
                      </div>
                      {!data.audit.length && (
                        <Empty title="No activity yet">
                          Workspace changes will appear here.
                        </Empty>
                      )}
                    </div>
                  )}
                  {page === "Settings" && (
                    <div className="page-pad settings-page">
                      <div className="page-heading">
                        <div>
                          <span className="eyebrow">
                            WORKSPACE CONFIGURATION
                          </span>
                          <h1>Settings</h1>
                          <p>
                            Local by default. External access is always visible.
                          </p>
                        </div>
                      </div>
                      <section className="panel-section">
                        <h2>Terminal & appearance</h2>
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            void run("settings.save", {
                              fontSize: Number(form.get("fontSize")),
                              lineHeight: Number(form.get("lineHeight")),
                              theme: form.get("theme"),
                            });
                          }}
                        >
                          <div className="form-row">
                            <Field label="Font size">
                              <input
                                name="fontSize"
                                type="number"
                                min="10"
                                max="28"
                                defaultValue={data.settings.fontSize}
                              />
                            </Field>
                            <Field label="Line height">
                              <input
                                name="lineHeight"
                                type="number"
                                min="1"
                                max="2"
                                step="0.05"
                                defaultValue={data.settings.lineHeight}
                              />
                            </Field>
                            <Field label="Theme">
                              <select
                                name="theme"
                                defaultValue={data.settings.theme}
                              >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                              </select>
                            </Field>
                          </div>
                          <button type="submit">Save appearance</button>
                        </form>
                      </section>
                      <section className="panel-section">
                        <h2>AI provider</h2>
                        <p>
                          Use authorized APIs or your own Ollama instance. API
                          providers may charge for requests.
                        </p>
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run("provider.save", {
                              ...provider,
                              key: apiKey,
                            }).then((result) => {
                              if (result) {
                                setApiKey("");
                                setNotice("Provider configuration saved.");
                              }
                            });
                          }}
                        >
                          <Field label="Provider">
                            <select
                              value={provider.kind}
                              onChange={(e) => {
                                const kind = e.target
                                  .value as ProviderConfig["kind"];
                                setProviderDraft({
                                  kind,
                                  model: kind === "ollama" ? "llama3.2" : "",
                                  endpoint:
                                    kind === "openai"
                                      ? "https://api.openai.com/v1"
                                      : kind === "anthropic"
                                        ? "https://api.anthropic.com"
                                        : "http://127.0.0.1:11434",
                                });
                              }}
                            >
                              <option value="ollama">Ollama</option>
                              <option value="openai">OpenAI-compatible</option>
                              <option value="anthropic">
                                Anthropic-compatible
                              </option>
                            </select>
                          </Field>
                          <Field label="API base URL">
                            <input
                              required
                              value={provider.endpoint}
                              onChange={(e) =>
                                setProviderDraft({
                                  ...provider,
                                  endpoint: e.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Model">
                            <input
                              required
                              value={provider.model}
                              onChange={(e) =>
                                setProviderDraft({
                                  ...provider,
                                  model: e.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field
                            label={
                              data.provider.hasKey
                                ? "API key (stored with OS encryption; blank keeps it)"
                                : "API key (stored with OS encryption)"
                            }
                          >
                            <input
                              type="password"
                              autoComplete="off"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                          </Field>
                          <button type="submit">Save provider</button>
                          <button
                            type="button"
                            onClick={() =>
                              void run("provider.save", {
                                ...provider,
                                clearKey: true,
                              })
                            }
                          >
                            Remove stored key
                          </button>
                        </form>
                      </section>
                      <section className="panel-section">
                        <h2>Optional semantic index</h2>
                        <p>
                          Send memory text to an Ollama embedding model only
                          after approval. Without an index, retrieval uses FTS5
                          and stored relationships.
                        </p>
                        <Field label="Ollama endpoint">
                          <input
                            value={embeddingEndpoint}
                            onChange={(e) =>
                              setEmbeddingEndpoint(e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Embedding model">
                          <input
                            value={embeddingModel}
                            onChange={(e) => setEmbeddingModel(e.target.value)}
                          />
                        </Field>
                        <button
                          onClick={() =>
                            void run<{ indexed: number }>("context.embed", {
                              endpoint: embeddingEndpoint,
                              model: embeddingModel,
                            }).then((result) => {
                              if (result)
                                setNotice(
                                  `${result.indexed} memories indexed.`,
                                );
                            })
                          }
                        >
                          Review & build semantic index
                        </button>
                      </section>
                      <section className="panel-section">
                        <h2>Backups & exports</h2>
                        <p>
                          JSON exports include sessions, memory versions, tasks,
                          relationships and audit records. A database backup
                          contains all workspaces.
                        </p>
                        <div className="toolbar">
                          <button
                            onClick={() => void exportData("export.json")}
                          >
                            <Download size={15} /> Workspace JSON
                          </button>
                          <button
                            onClick={() => void exportData("export.markdown")}
                          >
                            Knowledge Markdown
                          </button>
                          <button
                            onClick={() => void exportData("export.backup")}
                          >
                            Database backup
                          </button>
                          <button
                            onClick={() =>
                              void run<{
                                memories: number;
                                sessions: number;
                                duplicate: boolean;
                              }>("import.archive").then((result) => {
                                if (result)
                                  setNotice(
                                    result.duplicate
                                      ? "Archive already restored."
                                      : `Restored ${result.memories} memories and ${result.sessions} sessions.`,
                                  );
                              })
                            }
                          >
                            Restore workspace JSON
                          </button>
                        </div>
                      </section>
                      <section className="panel-section danger-zone">
                        <h2>Delete workspace data</h2>
                        <p>
                          Removes this workspace from MNEMO. The project folder
                          remains intact.
                        </p>
                        <button onClick={() => void run("workspace.delete")}>
                          Delete local workspace
                        </button>
                      </section>
                    </div>
                  )}
                </>
              )}
            </Suspense>
          </main>
          {right && workspace && (
            <aside className="context-panel">
              <div className="context-title">
                <BrainCircuit size={17} />
                <strong>Task context</strong>
                <Badge>LOCAL</Badge>
              </div>
              <p className="muted">Retrieve knowledge for the work at hand.</p>
              <Field label="Current task">
                <textarea
                  placeholder="What are you working on?"
                  value={contextQuery}
                  onChange={(e) => setContextQuery(e.target.value)}
                  rows={4}
                />
              </Field>
              <Field label="Context budget (estimated tokens)">
                <input
                  aria-label="Context token budget"
                  type="number"
                  min="100"
                  max="32000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
              </Field>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={semantic}
                  onChange={(e) => setSemantic(e.target.checked)}
                />{" "}
                Use optional semantic index
              </label>
              <button
                className="primary full"
                disabled={pending > 0}
                onClick={() => void retrieve()}
              >
                <Search size={15} /> Retrieve context
              </button>
              {bundle && (
                <>
                  <div className="context-metrics">
                    <div>
                      <strong>{bundle.tokens.toLocaleString()}</strong>
                      <span>estimated tokens</span>
                    </div>
                    <div>
                      <strong>{bundle.latencyMs.toFixed(1)} ms</strong>
                      <span>local retrieval</span>
                    </div>
                  </div>
                  <div className="budget-track">
                    <div
                      style={{
                        width: `${Math.min(100, (bundle.tokens / budget) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="muted small">
                    Full imported transcript baseline:{" "}
                    {bundle.baselineTokens.toLocaleString()} estimated tokens.
                    <br />
                    {bundle.baselineTokens
                      ? `${(bundle.savings * 100).toFixed(1)}% context reduction for this bundle.`
                      : "Import sessions to establish a baseline."}
                    <br />
                    UTF-8 bytes / 4 heuristic. Answer quality is not implied.
                  </p>
                  {bundle.conflicts.length > 0 && (
                    <div className="conflict">
                      {bundle.conflicts.length} stored contradiction(s). Inspect
                      both memories and their sources.
                    </div>
                  )}
                  <div className="section-heading">
                    <h3>Relevant knowledge</h3>
                    <span>{bundle.hits.length}</span>
                  </div>
                  {bundle.hits.map((hit) => (
                    <div className="context-hit" key={hit.memory.id}>
                      <button onClick={() => void openMemory(hit.memory)}>
                        <Badge>{hit.memory.status}</Badge>
                        <strong>{hit.memory.title}</strong>
                      </button>
                      <p>{hit.reasons.join(" · ")}</p>
                      <small>{hit.memory.source}</small>
                      <div>
                        <button
                          onClick={() =>
                            setPinned((p) =>
                              p.includes(hit.memory.id)
                                ? p.filter((id) => id !== hit.memory.id)
                                : [...p, hit.memory.id],
                            )
                          }
                        >
                          {pinned.includes(hit.memory.id) ? "Unpin" : "Pin"}
                        </button>
                        <button
                          onClick={() =>
                            setExcluded((p) => [...p, hit.memory.id])
                          }
                        >
                          Exclude
                        </button>
                      </div>
                    </div>
                  ))}
                  {!bundle.hits.length && (
                    <p className="muted">
                      No matching evidence. MNEMO will not invent context.
                    </p>
                  )}
                  <details>
                    <summary>Preview exact context</summary>
                    <pre className="context-preview">{bundle.text}</pre>
                  </details>
                  <button
                    className="full"
                    onClick={() =>
                      void run(
                        "context.copy",
                        { text: bundle.text },
                        false,
                      ).then(() => setNotice("Context copied."))
                    }
                  >
                    <Copy size={14} /> Copy context bundle
                  </button>
                </>
              )}
              <div className="context-bottom">
                <ShieldCheck size={16} />
                <p>
                  Only reviewed context is included in AI requests. Imported
                  text has no command authority.
                </p>
              </div>
            </aside>
          )}
        </div>
        <footer className="statusbar">
          <span>
            <span className="dot green" />
            {pending ? "Working…" : "Ready"}
          </span>
          <span>{workspace?.environment ?? "Local"} · SQLite / FTS5</span>
          <span className="spacer" />
          <span>MNEMO · knowledge with provenance</span>
          <kbd>Ctrl + 1</kbd>
        </footer>
      </div>
      {selected && (
        <FocusScope asChild trapped loop>
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <section
              className="modal memory-detail"
              role="dialog"
              aria-modal="true"
              aria-label="Memory details"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-heading">
                <Badge>{selected.status}</Badge>
                <span className="muted">{selected.type}</span>
                <span className="spacer" />
                <button
                  aria-label="Close memory details"
                  onClick={() => setSelected(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <h2>{selected.title}</h2>
              <pre>{selected.content}</pre>
              <dl>
                <dt>Source</dt>
                <dd>{selected.source}</dd>
                <dt>Created</dt>
                <dd>{date(selected.createdAt)}</dd>
                <dt>Last verified</dt>
                <dd>
                  {selected.verifiedAt
                    ? date(selected.verifiedAt)
                    : "Not verified"}
                </dd>
                <dt>Version</dt>
                <dd>{selected.version}</dd>
                <dt>Tags</dt>
                <dd>{selected.tags.join(", ") || "None"}</dd>
              </dl>
              <div className="toolbar">
                <button
                  onClick={() => {
                    setDraft({ ...selected });
                    setSelected(null);
                  }}
                >
                  Edit
                </button>
                {selected.status !== "Confirmed" && (
                  <button
                    className="primary"
                    onClick={() =>
                      void run<Memory>("memory.save", {
                        ...selected,
                        status: "Confirmed",
                      }).then((value) => {
                        if (value) setSelected(value);
                      })
                    }
                  >
                    <Check size={15} /> Confirm knowledge
                  </button>
                )}
                <button
                  onClick={() =>
                    void run<Memory>("memory.save", {
                      ...selected,
                      status: "Archived",
                    }).then((value) => {
                      if (value) setSelected(value);
                    })
                  }
                >
                  Reject / archive
                </button>
                <button
                  onClick={() =>
                    setPinned((p) => [...new Set([...p, selected.id])])
                  }
                >
                  Pin to context
                </button>
              </div>
              <Field label="Merge into another memory (result becomes Proposed)">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value)
                      void run<Memory>("memory.merge", {
                        fromId: selected.id,
                        toId: e.target.value,
                      }).then((value) => {
                        if (value) setSelected(value);
                      });
                  }}
                >
                  <option value="">Choose merge target</option>
                  {data.memories
                    .filter((m) => m.id !== selected.id)
                    .map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
              </Field>
              <details>
                <summary>Version history ({revisions.length})</summary>
                {revisions.map((r) => (
                  <article key={r.version}>
                    <strong>
                      Version {r.version} · {date(r.createdAt)}
                    </strong>
                    <pre>{r.snapshot}</pre>
                  </article>
                ))}
              </details>
              <details>
                <summary>Stored relationships</summary>
                {data.relationships
                  .filter(
                    (r) => r.fromId === selected.id || r.toId === selected.id,
                  )
                  .map((r) => (
                    <div className="relationship" key={r.id}>
                      <span>
                        {r.fromId} → {r.kind} → {r.toId}
                      </span>
                      <button
                        onClick={() =>
                          void run("relationship.delete", { id: r.id })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </details>
            </section>
          </div>
        </FocusScope>
      )}
      {draft && (
        <FocusScope asChild trapped loop>
          <div className="modal-backdrop">
            <form
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label="Memory editor"
              onSubmit={(event) => void saveMemory(event)}
            >
              <div className="modal-heading">
                <h2>{draft.id ? "Edit memory" : "New memory"}</h2>
                <span className="spacer" />
                <button
                  type="button"
                  aria-label="Close memory editor"
                  onClick={() => setDraft(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <Field label="Title">
                <input
                  autoFocus
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </Field>
              <div className="form-row">
                <Field label="Type">
                  <select
                    value={draft.type}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        type: e.target.value as MemoryInput["type"],
                      })
                    }
                  >
                    {memoryTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Verification status">
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        status: e.target.value as MemoryInput["status"],
                      })
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Content">
                <textarea
                  required
                  rows={8}
                  value={draft.content}
                  onChange={(e) =>
                    setDraft({ ...draft, content: e.target.value })
                  }
                />
              </Field>
              <Field label="Source reference">
                <input
                  value={draft.source}
                  onChange={(e) =>
                    setDraft({ ...draft, source: e.target.value })
                  }
                />
              </Field>
              <Field label="Tags (comma separated)">
                <input
                  value={draft.tags.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <p className="muted">
                Confirm only after checking the source. AI proposals are
                unverified by default.
              </p>
              <button className="primary" disabled={pending > 0} type="submit">
                Save memory
              </button>
            </form>
          </div>
        </FocusScope>
      )}
      {preview && (
        <FocusScope asChild trapped loop>
          <div className="modal-backdrop">
            <section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label="Import preview"
            >
              <div className="modal-heading">
                <h2>Review import</h2>
                <span className="spacer" />
                <button
                  aria-label="Close import preview"
                  onClick={() => setPreview(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <p>
                {preview.source} · {preview.sessions.length} sessions ·{" "}
                {preview.redactions} detected secrets redacted
              </p>
              {preview.warnings.map((w) => (
                <p key={w} className="muted">
                  {w}
                </p>
              ))}
              <div className="preview-list">
                {preview.sessions.map((s, index) => (
                  <div key={index}>
                    <strong>{s.title}</strong>
                    <span>
                      {s.provider} · {s.messageCount} messages
                    </span>
                  </div>
                ))}
              </div>
              <button
                className="primary"
                disabled={pending > 0}
                onClick={() =>
                  void run<{
                    imported: number;
                    updated: number;
                    duplicates: number;
                  }>("session.commit", { token: preview.token }).then(
                    (result) => {
                      if (result) {
                        setPreview(null);
                        setNotice(
                          `${result.imported} imported, ${result.updated} updated, ${result.duplicates} duplicates skipped.`,
                        );
                      }
                    },
                  )
                }
              >
                Import locally
              </button>
            </section>
          </div>
        </FocusScope>
      )}
      {taskDraft && (
        <FocusScope asChild trapped loop>
          <div className="modal-backdrop">
            <form
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label="Task editor"
              onSubmit={(event) => {
                event.preventDefault();
                void run("task.save", taskDraft).then((result) => {
                  if (result) setTaskDraft(null);
                });
              }}
            >
              <div className="modal-heading">
                <h2>Track a task</h2>
                <span className="spacer" />
                <button type="button" onClick={() => setTaskDraft(null)}>
                  <X size={18} />
                </button>
              </div>
              <Field label="Objective">
                <input
                  required
                  value={taskDraft.objective}
                  onChange={(e) =>
                    setTaskDraft({ ...taskDraft, objective: e.target.value })
                  }
                />
              </Field>
              <Field label="Requirements">
                <textarea
                  value={taskDraft.requirements}
                  onChange={(e) =>
                    setTaskDraft({ ...taskDraft, requirements: e.target.value })
                  }
                />
              </Field>
              <div className="form-row">
                <Field label="Status">
                  <select
                    value={taskDraft.status}
                    onChange={(e) =>
                      setTaskDraft({ ...taskDraft, status: e.target.value })
                    }
                  >
                    {taskStatuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Environment">
                  <select
                    value={taskDraft.environment}
                    onChange={(e) =>
                      setTaskDraft({
                        ...taskDraft,
                        environment: e.target.value,
                      })
                    }
                  >
                    {[
                      "Local",
                      "Development",
                      "Test",
                      "Staging",
                      "Production",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Observed execution / verification evidence">
                <textarea
                  value={taskDraft.evidence}
                  onChange={(e) =>
                    setTaskDraft({ ...taskDraft, evidence: e.target.value })
                  }
                />
              </Field>
              <Field label="Blockers">
                <textarea
                  value={taskDraft.blockers}
                  onChange={(e) =>
                    setTaskDraft({ ...taskDraft, blockers: e.target.value })
                  }
                />
              </Field>
              <Field label="Related session">
                <select
                  value={taskDraft.sessionId ?? ""}
                  onChange={(e) =>
                    setTaskDraft({
                      ...taskDraft,
                      sessionId: e.target.value || null,
                    })
                  }
                >
                  <option value="">None</option>
                  {data.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Relevant knowledge">
                <select
                  multiple
                  value={taskDraft.memoryIds ?? []}
                  onChange={(e) =>
                    setTaskDraft({
                      ...taskDraft,
                      memoryIds: [...e.target.selectedOptions].map(
                        (o) => o.value,
                      ),
                    })
                  }
                >
                  {data.memories.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="muted">
                Executed and Verified require observed evidence. AI suggestions
                do not count.
              </p>
              <button className="primary" type="submit">
                Save task
              </button>
            </form>
          </div>
        </FocusScope>
      )}
      {agentDraft && (
        <FocusScope asChild trapped loop>
          <div className="modal-backdrop">
            <form
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label="Profile editor"
              onSubmit={(event) => {
                event.preventDefault();
                void run("profile.save", {
                  ...agentDraft,
                  tools: [],
                  memoryTypes: [...memoryTypes],
                }).then((result) => {
                  if (result) setAgentDraft(null);
                });
              }}
            >
              <div className="modal-heading">
                <h2>Instruction profile</h2>
                <span className="spacer" />
                <button type="button" onClick={() => setAgentDraft(null)}>
                  <X size={18} />
                </button>
              </div>
              <Field label="Name">
                <input
                  required
                  value={agentDraft.name}
                  onChange={(e) =>
                    setAgentDraft({ ...agentDraft, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Instructions & coding standards">
                <textarea
                  rows={8}
                  required
                  value={agentDraft.instructions}
                  onChange={(e) =>
                    setAgentDraft({
                      ...agentDraft,
                      instructions: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Verification requirements">
                <textarea
                  value={agentDraft.verification}
                  onChange={(e) =>
                    setAgentDraft({
                      ...agentDraft,
                      verification: e.target.value,
                    })
                  }
                />
              </Field>
              <button className="primary" type="submit">
                Save profile
              </button>
            </form>
          </div>
        </FocusScope>
      )}
    </div>
  );
}
function RelationForm({
  data,
  save,
}: {
  data: Snapshot;
  save: (args: unknown) => void;
}) {
  const entities = [
    ...data.memories.map((m) => ({ id: m.id, title: m.title })),
    ...data.sessions.map((s) => ({ id: s.id, title: s.title })),
    ...data.tasks.map((t) => ({ id: t.id, title: t.objective })),
  ];
  return (
    <form
      className="toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        save(Object.fromEntries(values));
      }}
    >
      <select name="fromId" required aria-label="Relationship from">
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>
      <select name="kind" aria-label="Relationship kind">
        {[
          "relates to",
          "contradicts",
          "resolved by",
          "affects",
          "requires",
          "uses",
          "derived from",
        ].map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <select name="toId" required aria-label="Relationship to">
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>
      <button type="submit">Save relationship</button>
    </form>
  );
}
