import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { Plus, Columns2, X, Search, TerminalSquare } from "lucide-react";
import "@xterm/xterm/css/xterm.css";
import type { TerminalSettings } from "../shared/types";
interface PaneProps {
  id: string;
  settings: TerminalSettings;
  report: (error: unknown) => void;
}
function Pane({ id, settings, report }: PaneProps) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<XTerm | null>(null);
  const search = useRef<SearchAddon | null>(null);
  const [exit, setExit] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      scrollback: 10000,
      theme: {
        background: "#0B0D10",
        foreground: "#E9EDF2",
        cursor: "#7DA8E8",
        selectionBackground: "#2a3d56",
      },
    });
    const fit = new FitAddon(),
      find = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(find);
    term.open(element.current!);
    instance.current = term;
    search.current = find;
    const stop = window.mnemo.onTerminal((event) => {
      if (event.id !== id) return;
      if (event.data) term.write(event.data);
      if (event.exitCode !== undefined) {
        setExit(event.exitCode);
        term.write(`\r\n[Shell exited: ${event.exitCode}]\r\n`);
      }
    });
    const data = term.onData((value) => {
      void window.mnemo
        .call("terminal.write", { id, data: value })
        .catch(report);
    });
    const size = term.onResize(({ cols, rows }) => {
      void window.mnemo
        .call("terminal.resize", { id, cols, rows })
        .catch(report);
    });
    const resize = new ResizeObserver(() => {
      if (element.current?.clientWidth && element.current?.clientHeight)
        fit.fit();
    });
    resize.observe(element.current!);
    fit.fit();
    term.focus();
    return () => {
      stop();
      data.dispose();
      size.dispose();
      resize.disconnect();
      term.dispose();
      instance.current = null;
    };
    // A pane keeps its terminal alive; appearance changes are applied below.
    // The effect depends only on the live terminal identifier.
  }, [id]);
  useEffect(() => {
    if (instance.current) {
      instance.current.options.fontSize = settings.fontSize;
      instance.current.options.lineHeight = settings.lineHeight;
      instance.current.options.theme =
        settings.theme === "dark"
          ? { background: "#0B0D10", foreground: "#E9EDF2", cursor: "#7DA8E8" }
          : { background: "#f6f8fa", foreground: "#17212e", cursor: "#305f9e" };
    }
  }, [settings]);
  return (
    <div className="terminal-pane">
      <div className="terminal-search">
        <span className={"dot " + (exit === null ? "green" : "")} />
        <span>{exit === null ? "PowerShell · running" : `Exited ${exit}`}</span>
        <Search size={13} />
        <input
          aria-label="Search terminal output"
          placeholder="Find in output"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search.current?.findNext(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") search.current?.findNext(query);
          }}
        />
      </div>
      <div ref={element} className="xterm-host" />
    </div>
  );
}
export function TerminalView({
  workspaceId,
  cwd,
  settings,
  report,
}: {
  workspaceId: string;
  cwd: string;
  settings: TerminalSettings;
  report: (error: unknown) => void;
}) {
  const [tabs, setTabs] = useState<{ id: string; name: string }[]>([]),
    [active, setActive] = useState(""),
    [split, setSplit] = useState(false);
  async function add() {
    try {
      const result = await window.mnemo.call<{ id: string }>("terminal.create");
      setTabs((t) => [...t, { id: result.id, name: `Shell ${t.length + 1}` }]);
      setActive(result.id);
    } catch (error) {
      report(error);
    }
  }
  async function close(id: string) {
    await window.mnemo.call("terminal.close", { id }).catch(report);
    setTabs((t) => {
      const next = t.filter((v) => v.id !== id);
      if (active === id) setActive(next[0]?.id ?? "");
      return next;
    });
  }
  useEffect(() => {
    setTabs([]);
    setActive("");
    setSplit(false);
  }, [workspaceId]);
  return (
    <div className="terminal-view">
      <div className="terminal-tabs">
        <TerminalSquare size={16} />
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={"terminal-tab " + (active === tab.id ? "active" : "")}
          >
            <button onClick={() => setActive(tab.id)}>{tab.name}</button>
            <button
              aria-label={`Close ${tab.name}`}
              onClick={() => void close(tab.id)}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          className="icon-button"
          aria-label="New terminal"
          onClick={() => void add()}
        >
          <Plus size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Split terminals"
          onClick={() => setSplit(!split)}
        >
          <Columns2 size={17} />
        </button>
        <span className="spacer" />
        <span className="muted">{tabs.length}/8</span>
      </div>
      <div className="terminal-cwd">{cwd}</div>
      {!tabs.length ? (
        <div className="empty terminal-empty">
          <TerminalSquare size={40} />
          <h2>A real shell. Your workspace.</h2>
          <p>
            PowerShell runs locally in the selected project folder.
            <br />
            Type commands directly; AI responses never execute here.
          </p>
          <button className="primary" onClick={() => void add()}>
            Open PowerShell
          </button>
        </div>
      ) : (
        <div className={"terminal-panes " + (split ? "split" : "")}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="terminal-slot"
              style={{
                display:
                  tab.id === active ||
                  (split && tab.id === tabs.find((t) => t.id !== active)?.id)
                    ? "flex"
                    : "none",
              }}
            >
              <Pane id={tab.id} settings={settings} report={report} />
            </div>
          ))}
        </div>
      )}
      <div className="terminal-foot">
        <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> copy selection{" "}
        <span>•</span> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> paste{" "}
        <span className="spacer" />
        History belongs to your shell
      </div>
    </div>
  );
}
