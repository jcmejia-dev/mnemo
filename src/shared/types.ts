export const memoryTypes = [
  "Project",
  "Architecture",
  "Technical Decision",
  "Procedure",
  "Debugging Lesson",
  "Environment",
  "Business Rule",
  "Open Question",
  "User Preference",
  "Verified Fact",
] as const;
export const statuses = [
  "Proposed",
  "Confirmed",
  "Disputed",
  "Superseded",
  "Archived",
] as const;
export const taskStatuses = [
  "Prepared",
  "Attempted",
  "Executed",
  "Verified",
  "Not Executed",
  "Blocked",
] as const;
export type MemoryType = (typeof memoryTypes)[number];
export type MemoryStatus = (typeof statuses)[number];
export interface Workspace {
  id: string;
  name: string;
  path: string;
  environment: string;
  createdAt: string;
}
export interface Message {
  role: string;
  content: string;
  timestamp?: string;
}
export interface Session {
  id: string;
  workspaceId: string;
  title: string;
  provider: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  tags: string[];
  summary: string;
  messages?: Message[];
}
export interface Memory {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  type: MemoryType;
  status: MemoryStatus;
  source: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  version: number;
  confidence: number;
}
export interface MemoryInput {
  id?: string;
  title: string;
  content: string;
  type: MemoryType;
  status: MemoryStatus;
  source: string;
  tags: string[];
}
export interface Relationship {
  id: string;
  workspaceId: string;
  fromId: string;
  toId: string;
  kind: string;
}
export interface Task {
  id: string;
  workspaceId: string;
  objective: string;
  requirements: string;
  environment: string;
  status: string;
  evidence: string;
  blockers: string;
  updatedAt: string;
  sessionId: string | null;
  memoryIds: string[];
}
export interface Profile {
  id: string;
  workspaceId: string;
  name: string;
  instructions: string;
  tools: string[];
  memoryTypes: string[];
  verification: string;
}
export interface RetrievalHit {
  memory: Memory;
  score: number;
  reasons: string[];
  tokens: number;
}
export interface Bundle {
  text: string;
  hits: RetrievalHit[];
  tokens: number;
  baselineTokens: number;
  savings: number;
  conflicts: Relationship[];
  latencyMs: number;
  estimator: string;
  excluded: number;
}
export interface ImportPreview {
  token: string;
  source: string;
  sessions: { title: string; provider: string; messageCount: number }[];
  redactions: number;
  warnings: string[];
}
export interface Audit {
  id: string;
  workspaceId: string;
  action: string;
  entityId: string;
  detail: string;
  createdAt: string;
}
export interface ProviderConfig {
  kind: "openai" | "anthropic" | "ollama";
  endpoint: string;
  model: string;
  hasKey?: boolean;
}
export interface McpConfig {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  tools?: string[];
  status?: string;
}
export interface TerminalSettings {
  fontSize: number;
  lineHeight: number;
  theme: "dark" | "light";
}
export interface Snapshot {
  workspace: Workspace | null;
  workspaces: Workspace[];
  sessions: Session[];
  memories: Memory[];
  relationships: Relationship[];
  tasks: Task[];
  profiles: Profile[];
  audit: Audit[];
  counts: { sessions: number; memories: number };
  settings: TerminalSettings;
  provider: ProviderConfig;
  mcp: McpConfig[];
  usage: {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    contextTokens: number;
    actual: unknown;
    provider: string;
    model: string;
    createdAt: string;
  } | null;
}
export interface TerminalEvent {
  id: string;
  data?: string;
  exitCode?: number;
}
export interface MnemoApi {
  call<T = unknown>(method: string, args?: unknown): Promise<T>;
  onTerminal(callback: (event: TerminalEvent) => void): () => void;
}
