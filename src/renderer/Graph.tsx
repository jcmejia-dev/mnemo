import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Snapshot, Memory } from "../shared/types";
export function Graph({
  data,
  onMemory,
}: {
  data: Snapshot;
  onMemory: (memory: Memory) => void;
}) {
  const [filter, setFilter] = useState("All"),
    [query, setQuery] = useState(""),
    [focus, setFocus] = useState(""),
    [inspection, setInspection] = useState("");
  const { nodes, edges } = useMemo(() => {
    const entities = [
      ...(data.workspace
        ? [
            {
              id: data.workspace.id,
              title: data.workspace.name,
              type: "Project",
            },
          ]
        : []),
      ...data.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        type: "Session",
      })),
      ...data.memories.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        status: m.status,
      })),
      ...data.tasks.map((t) => ({
        id: t.id,
        title: t.objective,
        type: "Task",
      })),
    ];
    const connected = new Set(
      data.relationships
        .filter((r) => r.fromId === focus || r.toId === focus)
        .flatMap((r) => [r.fromId, r.toId]),
    );
    const filtered = entities
      .filter(
        (e) =>
          (filter === "All" || e.type === filter) &&
          (!focus || e.id === focus || connected.has(e.id)),
      )
      .slice(0, 300);
    const ids = new Set(filtered.map((e) => e.id));
    const nodes: Node[] = filtered.map((e, index) => ({
      id: e.id,
      data: {
        label: (
          <div className="graph-node">
            <span>{e.type}</span>
            <strong>{e.title}</strong>
            {"status" in e && <small>{String(e.status)}</small>}
          </div>
        ),
      },
      position: { x: (index % 5) * 260, y: Math.floor(index / 5) * 140 },
      style: {
        width: 220,
        background: e.id === data.workspace?.id ? "#20334b" : "#151a22",
        color: "#E9EDF2",
        border: `1px solid ${query && e.title.toLowerCase().includes(query.toLowerCase()) ? "#7DA8E8" : "#343f4e"}`,
        borderRadius: 10,
      },
    }));
    const edges: Edge[] = data.relationships
      .filter((r) => ids.has(r.fromId) && ids.has(r.toId))
      .map((r) => ({
        id: r.id,
        source: r.fromId,
        target: r.toId,
        label: r.kind,
        style: { stroke: r.kind === "contradicts" ? "#ce8b7b" : "#44566e" },
        labelStyle: { fill: "#a2b3c8" },
        labelBgStyle: { fill: "#10151c" },
      }));
    return { nodes, edges };
  }, [data, filter, query, focus]);
  return (
    <div className="graph-view">
      <div className="toolbar">
        <input
          placeholder="Highlight knowledge…"
          aria-label="Highlight graph"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Graph category"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            "All",
            "Project",
            "Session",
            "Task",
            ...new Set(data.memories.map((m) => m.type)),
          ].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <button onClick={() => setFocus("")}>Reset focus</button>
        <span className="muted">
          {nodes.length} nodes · {edges.length} stored edges · display cap 300
        </span>
      </div>
      <div className="graph-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.15}
          maxZoom={2}
          colorMode="dark"
          onNodeClick={(_event, node) => {
            const memory = data.memories.find((m) => m.id === node.id);
            if (memory) onMemory(memory);
            setInspection(
              data.relationships
                .filter((r) => r.fromId === node.id || r.toId === node.id)
                .map((r) => `${r.fromId} → ${r.kind} → ${r.toId}`)
                .join("\n") || "No stored relationships.",
            );
          }}
          onNodeDoubleClick={(_event, node) => setFocus(node.id)}
          onEdgeClick={(_event, edge) =>
            setInspection(`${edge.source}\n${edge.label}\n${edge.target}`)
          }
        >
          <Background gap={24} color="#232c38" />
          <Controls />
          <MiniMap nodeColor="#344862" maskColor="rgba(8,11,15,.75)" />
        </ReactFlow>
      </div>
      <div className="graph-inspection">
        {inspection ||
          "Click a node to inspect. Double-click to focus on its stored neighbors."}
      </div>
    </div>
  );
}
