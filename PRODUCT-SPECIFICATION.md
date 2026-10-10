# PROJECT MNEMO — Intelligent AI Developer Workspace

## YOUR ROLE

Act as a principal software engineer, AI systems architect, desktop application engineer, LLM integration specialist, MCP protocol engineer, database architect, technical product designer, and security engineer.

Your mission is to design, implement, test, document, and deliver a production-quality, open-source developer application called:

# MNEMO

**An intelligent workspace for developers and AI agents.**

MNEMO is a terminal-first desktop application that consolidates AI coding sessions, maintains persistent project knowledge, retrieves relevant context, integrates external tools through Model Context Protocol (MCP), and helps developers reduce unnecessary LLM context usage.

This is not a chatbot wrapper, UI demonstration, or conceptual prototype.

Build a functional application that a developer can install on Windows and use in real development workflows.

The project will also serve as a flagship portfolio demonstration of:

- Desktop software engineering
- Full-stack development
- LLM integration
- MCP architecture
- Context engineering
- Information retrieval
- Developer productivity tooling
- Database design
- Security
- Testing
- Technical documentation
- CI/CD

## 1. IMPORTANT OWNERSHIP AND SECURITY REQUIREMENTS

This is a completely new, independently developed application.

Do not attempt to retrieve, clone, or reproduce proprietary source code from a previous employer.

Do not access former employer infrastructure, internal databases, private repositories, credentials, or confidential AI conversations.

Use only:

- Newly written code
- Public documentation
- Properly licensed open-source dependencies
- Personal test sessions
- Synthetic sample data
- User-authorized integrations

Do not copy internal business rules or confidential accounting information.

MNEMO must be suitable for public release without exposing sensitive information.

---

# 2. CORE PRODUCT VISION

The central problem:

Developers using LLMs often struggle with fragmented sessions, repeated explanations, excessive context, inconsistent AI memory, lost debugging discoveries, and difficulty transferring knowledge between projects.

MNEMO solves these problems through an intelligent local workspace.

Its purpose is to:

1. Consolidate AI development sessions.
2. Organize persistent project knowledge.
3. Retrieve relevant information on demand.
4. Reduce redundant context.
5. Provide a powerful terminal interface.
6. Integrate tools and services through MCP.
7. Maintain transparent knowledge provenance.
8. Support reproducible development workflows.
9. Visualize relationships between knowledge.
10. Help developers work more efficiently with AI.

The application should feel like a combination of a premium terminal, a developer knowledge base, and an AI orchestration workspace.

---

# 3. TECHNOLOGY STACK

Preferred architecture:

Desktop:
- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Accessible component primitives
- Lucide icons
- Motion for React

Terminal:
- xterm.js
- node-pty

Storage:
- SQLite
- Drizzle ORM
- SQLite FTS5 for full-text search

Knowledge retrieval:
- Hybrid keyword and semantic retrieval
- Optional local embedding model
- Vector index appropriate for local use
- Graph-based relationship indexing

Visualization:
- React Flow for knowledge relationships
- Cytoscape.js or equivalent for larger graphs

LLM:
- Provider-independent adapter architecture
- Claude-compatible provider integration where authorized
- OpenAI-compatible APIs
- Ollama
- Optional other compatible providers

MCP:
- Official maintained MCP SDK
- Client support for approved MCP servers
- Optional local MCP server exposing MNEMO's own tools

Testing:
- Vitest
- Playwright
- Electron-compatible end-to-end testing

Packaging:
- Windows installer
- Electron Builder or equivalent maintained packaging solution

Use maintained dependencies and verify version compatibility.

Do not use a remote database for the core application.

MNEMO must function locally without a cloud account.

---

# 4. DESIGN SYSTEM — PREMIUM DEVELOPER TOOL

Create a refined, minimal desktop application.

The aesthetic should combine:

- The visual discipline of Linear
- The usability of VS Code
- The terminal experience of modern terminal emulators
- The typography of premium developer tools

Do not copy proprietary designs.

Primary theme:

- Background: `#0B0D10`
- Surface: `#13161B`
- Elevated surface: `#1B2027`
- Primary text: `#E9EDF2`
- Secondary text: `#8C97A5`
- Borders: `#2A313B`
- Accent: `#7DA8E8`

Use restrained colors.

Avoid excessive gradients, glows, and glassmorphism.

Provide optional light mode.

Use a professional monospaced font for the terminal.

Support configurable font size, line height, and terminal appearance.

## Layout

Left sidebar:
- Workspace
- Terminal
- Sessions
- Memory
- Knowledge Graph
- Agents
- MCP Tools
- Activity
- Settings

Main content:
- Active workspace
- Terminal or selected tool
- Tabs and split views

Right contextual panel:
- Relevant memory
- Active task
- Source references
- Token estimates
- Tool status

The interface should be clean, resizable, keyboard-friendly, and responsive to desktop window sizes.

---

# 5. INTEGRATED TERMINAL

Build a real interactive terminal, not a simulated command prompt.

Features:

- PowerShell support on Windows
- Command execution
- Working directory management
- Command history
- Multiple terminal tabs
- Split terminals
- Copy and paste
- Search terminal output
- Terminal themes
- Command status indicators
- Keyboard shortcuts
- Persistent terminal profiles

Use node-pty and xterm.js.

Handle terminal resizing correctly.

Do not execute arbitrary commands merely because an AI suggests them.

All AI-proposed commands require explicit user approval unless the user has configured a narrowly scoped, safe automation policy.

Clearly identify the active working directory.

Never silently execute destructive commands.

---

# 6. AI SESSION MANAGEMENT

Implement a session explorer capable of importing and indexing authorized AI development conversations.

Support:

- User-selected Claude session exports or supported local session files
- JSON imports
- Markdown imports
- Plain-text transcripts
- Optional additional providers through adapters

Do not assume undocumented provider file formats are stable.

Implement versioned import adapters and clear errors for unsupported formats.

For every session, store:

- Session identifier
- Provider
- Project
- Title
- Creation date
- Last updated date
- Message count
- Imported source
- Tags
- Summaries
- Linked tasks
- Linked knowledge

Provide:

- Searchable session history
- Filtering
- Session timelines
- Session summaries
- Cross-session search
- Duplicate detection
- Incremental indexing
- Import previews
- Import progress indicators

Support incremental import rather than repeatedly reprocessing entire histories.

Never automatically upload imported sessions to an external service.

---

# 7. PERSISTENT MEMORY ENGINE

This is the heart of MNEMO.

Implement a structured, persistent knowledge system.

Memory categories:

1. Projects
2. Architecture
3. Technical Decisions
4. Procedures
5. Debugging Lessons
6. Environment Information
7. Business Rules
8. Open Questions
9. User Preferences
10. Verified Facts

Every memory record must include:

- Unique ID
- Title
- Content
- Memory type
- Project association
- Source reference
- Creation timestamp
- Last verified timestamp
- Confidence or verification status
- Related memories
- Version history
- Tags

Verification statuses:

- Confirmed
- Proposed
- Disputed
- Superseded
- Archived

Do not treat AI-generated summaries as verified facts.

Preserve the original source for traceability.

Allow users to edit, approve, reject, merge, and archive memories.

Maintain an audit trail of important changes.

---

# 8. INTELLIGENT MEMORY EXTRACTION

Implement a workflow that proposes reusable knowledge from imported sessions.

Example:

A conversation contains:

"The API request failed because the authentication token expired."

MNEMO may propose:

Title: Expired authentication token causes API failure

Type: Debugging Lesson

Status: Proposed

Source: Session reference

The user can approve or reject the proposal.

Do not silently convert uncertain AI output into confirmed knowledge.

Detect:

- Repeated solutions
- Important decisions
- Recurring errors
- Environment constraints
- Useful commands
- Project conventions
- Contradictory information
- Unresolved problems

Avoid storing irrelevant conversational noise.

---

# 9. CONTEXT RETRIEVAL ENGINE

Build a retrieval system that finds the most relevant knowledge for the user's current task.

Use a hybrid approach:

- Keyword search
- Semantic similarity
- Project relevance
- Recency
- Verification status
- Source quality
- Relationship relevance

Support:

- Search filters
- Relevance explanations
- Source citations
- Context previews
- Token-budget controls
- Manual memory pinning
- Context exclusions
- Retrieval diagnostics

The system must prioritize confirmed knowledge over unsupported summaries when appropriate.

Never fabricate missing context.

When information conflicts, surface the disagreement.

Do not silently choose an uncertain answer.

---

# 10. TOKEN OPTIMIZATION

One of MNEMO's main objectives is reducing unnecessary LLM token consumption.

Implement:

- Task-specific context selection
- Memory deduplication
- Relevance ranking
- Context compression
- Summary caching
- Incremental updates
- Token-budget configuration
- Context preview
- Reusable prompt templates

Provide a token usage dashboard.

Show:

- Estimated input tokens
- Estimated output tokens
- Context size
- Retrieval overhead
- Estimated savings against a defined baseline
- Actual API usage where providers expose it

Do not claim token savings without measurement.

Token optimization must preserve essential technical constraints and source references.

Implement benchmark tests comparing:

A. Full conversation context

B. Naive summarization

C. MNEMO retrieval

Measure:

- Context token usage
- Retrieval accuracy
- Answer correctness
- Missing critical constraints
- Latency
- Cost where applicable

Use the same test tasks across all approaches.

Document the methodology.

---

# 11. KNOWLEDGE GRAPH VISUALIZATION

Create an interactive knowledge graph.

This should be a signature feature.

Instead of showing only folders, represent knowledge as connected nodes.

Node categories:

- Projects
- Sessions
- Memories
- Decisions
- Problems
- Solutions
- Tools
- Procedures
- Tasks

Connections represent meaningful relationships.

Examples:

Project → Uses Technology

Problem → Resolved By Solution

Decision → Affects Architecture

Memory → Derived From Session

Task → Requires Procedure

Conflicting Memory → Contradicts Memory

## Visual design

Use a beautiful dark canvas.

Nodes should feel like an organized neural network, not a chaotic particle effect.

Provide:

- Zoom and pan
- Expand and collapse
- Node selection
- Relationship inspection
- Search and highlight
- Category filtering
- Project filtering
- Focus mode
- Automatic layout
- Minimap
- Performance optimization

Clicking a node should reveal its content, source, verification status, and related records.

Avoid random relationships generated merely for visual appeal.

All edges must correspond to actual stored relationships.

---

# 12. AGENT WORKSPACES AND SPECIALIZATIONS

Implement configurable AI workspaces.

Examples:

- Frontend Engineer
- Laravel Developer
- SQL Debugger
- Automation Engineer
- Documentation Specialist
- Code Reviewer

Each workspace may define:

- Instructions
- Tool permissions
- Relevant knowledge sources
- Preferred context
- Coding standards
- Verification requirements
- Output structure

Do not represent these as separate intelligent beings.

They are configurable instruction and tool profiles.

Support reusable workspace templates.

Allow users to create custom profiles.

---

# 13. MCP INTEGRATION

Implement a proper MCP client using the official SDK.

Support:

- Local stdio MCP servers
- Remote MCP servers where supported
- Tool discovery
- Tool invocation
- Resource access
- Prompt templates where supported
- Connection status
- Permission management
- Error handling
- Server configuration

Create an MCP management interface.

Display:

- Connected servers
- Available tools
- Tool descriptions
- Permission requirements
- Recent tool activity
- Connection errors

Implement explicit user authorization for sensitive operations.

Never automatically trust arbitrary MCP servers.

Clearly identify which server will receive information.

Protect credentials using appropriate operating-system storage mechanisms.

## MNEMO MCP Server

Optionally expose MNEMO functionality to external compatible AI clients.

Example tools:

- `mnemo.search_memory`
- `mnemo.get_project_context`
- `mnemo.list_sessions`
- `mnemo.get_debugging_lessons`
- `mnemo.get_decisions`
- `mnemo.propose_memory`
- `mnemo.get_context_bundle`

Require authorization for mutation operations.

Use least-privilege permissions.

Avoid exposing private data across unrelated workspaces.

---

# 14. TASK AND DEBUGGING WORKFLOWS

Create a structured task manager integrated with memory.

Each task should support:

- Objective
- Requirements
- Environment
- Current status
- Attempts
- Evidence
- Blockers
- Related sessions
- Relevant knowledge
- Verification results

Support these execution statuses:

- Prepared
- Attempted
- Executed
- Verified
- Not Executed
- Blocked

Important:

Never mark a task as executed simply because an AI proposed a command.

Never mark it verified without evidence.

Distinguish:

- Planned actions
- Generated instructions
- Commands actually executed
- Results actually observed
- Verification performed

Implement task timelines and execution logs.

---

# 15. DEVELOPMENT ENVIRONMENT SAFETY

Support environment labels:

- Local
- Development
- Test
- Staging
- Production

Allow the user to configure workspace-specific environments.

Show the active environment prominently.

For database operations:

- Prefer read-only inspection
- Require explicit confirmation for mutations
- Support dry-run workflows where feasible
- Display the target connection clearly
- Never infer the environment from database names alone
- Never claim production changes without execution evidence

Do not automatically connect to private databases.

Do not include credentials in documentation or logs.

---

# 16. AI CHAT AND ORCHESTRATION

Implement an optional integrated AI assistant.

Features:

- Provider selection
- Model selection
- Conversation history
- Context preview
- Relevant memory retrieval
- Tool permissions
- Structured responses
- Code blocks
- Source citations
- Task-linked conversations

Support:

- OpenAI-compatible APIs
- Claude-compatible integrations through authorized APIs
- Local Ollama models

Do not promise unrestricted access to proprietary subscription-based AI services.

Clearly explain that API usage may incur provider charges.

The core terminal, memory, session explorer, and knowledge graph must function without a paid AI subscription.

---

# 17. PRIVACY AND SECURITY

MNEMO is a local-first developer tool.

Implement:

- Local database storage
- Secure credential management
- Data export
- Data deletion
- Workspace isolation
- Import validation
- Secret redaction
- Safe logging
- Tool permission prompts
- Protection against prompt injection
- Clear external-data transmission indicators

Treat imported conversations, repository files, and MCP responses as untrusted input.

Never interpret retrieved text as higher-priority system instructions.

Never allow imported sessions to trigger command execution automatically.

Disable unsafe Electron renderer capabilities.

Use context isolation, sandboxing where compatible, and a narrowly scoped IPC API.

Do not expose unrestricted filesystem or shell access to the renderer.

---

# 18. PERFORMANCE

The application should remain responsive with large session histories.

Implement:

- Incremental indexing
- Background processing
- Pagination
- Virtualized lists
- Debounced search
- Graph clustering
- Query optimization
- Caching
- Cancellation of expensive tasks

Test with synthetic datasets containing:

- 100 sessions
- 1,000 sessions
- 10,000 sessions

Measure indexing time, search latency, memory usage, and graph responsiveness.

Do not claim performance targets without measurements.

---

# 19. BACKUP AND EXPORT

Support:

- JSON export
- Markdown export
- Database backup
- Project-specific knowledge export
- Memory version history
- Import validation

Allow users to back up their entire MNEMO workspace.

Ensure imports cannot silently overwrite existing data.

---

# 20. DOCUMENTATION

Create professional technical documentation.

Required files:

- README.md
- ARCHITECTURE.md
- CONTRIBUTING.md
- SECURITY.md
- CHANGELOG.md
- MCP-INTEGRATION.md
- MEMORY-ENGINE.md
- TOKEN-BENCHMARKS.md
- DEVELOPMENT.md

Document:

- Installation
- Development setup
- System architecture
- Database schema
- Memory lifecycle
- Session import formats
- Retrieval algorithm
- MCP permissions
- AI provider configuration
- Security boundaries
- Troubleshooting
- Release process

Documentation must match the actual implementation.

Avoid claiming unsupported functionality.

---

# 21. AUTOMATED TESTING

Implement tests for:

- Session imports
- Duplicate detection
- Memory extraction
- Memory approval
- Knowledge graph relationships
- Context retrieval
- Conflict detection
- Token estimates
- MCP connections
- Permission enforcement
- Terminal initialization
- Database migrations
- Export and import
- Error handling

Create integration tests and desktop end-to-end tests.

Use synthetic data.

---

# 22. CI/CD AND RELEASES

Create GitHub Actions workflows in YAML.

Required checks:

- Install dependencies
- Lint
- Type check
- Unit tests
- Integration tests
- Production build
- Windows package build

Create a release workflow for versioned Windows installers.

Do not publish a release unless the required checks pass.

Provide checksums for distributable binaries.

Do not sign installers unless valid signing credentials are available.

Never embed API secrets into packaged applications.

---

# 23. IMPLEMENTATION STRATEGY

Build the application in milestones.

### Milestone 1 — Functional Desktop Foundation

Deliver:

- Working Electron application
- React interface
- Functional terminal
- SQLite persistence
- Workspace management
- Basic session import

### Milestone 2 — Persistent Knowledge

Deliver:

- Memory CRUD
- Source references
- Search
- Verification states
- Knowledge extraction proposals

### Milestone 3 — Context Intelligence

Deliver:

- Hybrid retrieval
- Context bundles
- Token budgeting
- Relevance diagnostics
- Conflict detection

### Milestone 4 — Knowledge Graph

Deliver:

- Interactive graph
- Stored relationships
- Filtering
- Node inspection
- Performance optimization

### Milestone 5 — AI and MCP

Deliver:

- Provider adapters
- AI chat
- MCP client
- MCP server
- Tool permissions
- Agent profiles

### Milestone 6 — Production Quality

Deliver:

- Automated tests
- Security hardening
- Documentation
- Windows installer
- CI/CD
- Benchmark reports

Each milestone must be runnable and independently testable.

Do not present unimplemented features as complete.

---

# 24. FINAL DELIVERABLES

Deliver:

1. Complete source code.
2. Working desktop application.
3. SQLite schema and migrations.
4. Functional integrated terminal.
5. AI session importer.
6. Persistent memory engine.
7. Knowledge graph visualization.
8. Context retrieval system.
9. Token optimization dashboard.
10. MCP integration.
11. Documentation.
12. Automated tests.
13. GitHub Actions pipelines.
14. Windows installer.
15. Installation instructions.
16. Technical architecture diagrams.
17. Verified performance benchmarks.

If an external API key, permission, or deployment credential is required, clearly identify the dependency instead of fabricating success.

---

# FINAL PRODUCT STANDARD

MNEMO must be a genuinely useful developer tool, not a visually impressive but nonfunctional prototype.

Prioritize:

1. Correctness
2. Security
3. Reliable persistence
4. Retrieval accuracy
5. Terminal functionality
6. Developer usability
7. Performance
8. Visual polish

The final application should be suitable for a public GitHub repository and an engineering portfolio case study.

Start by implementing the actual desktop foundation, not by generating screenshots or a design-only preview.

Work systematically, validate every major feature, and document the results.