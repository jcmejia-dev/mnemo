# Token and performance benchmarks

Measured on **10 October 2026**, Windows 10 build 19045 x64, AMD Ryzen 5 4600G, approximately 15.87 GiB RAM, Node v24.18.0, pinned dependencies. Raw data: `benchmarks/results.json` and `benchmarks/desktop-results.json`. These are synthetic local measurements on this machine, not portable performance guarantees.

## Methodology

Run `npm run benchmark` to create fresh temporary WAL databases with 100, 1,000 and 10,000 sessions. Each session contains two synthetic messages (one debugging statement and repeated unrelated text). Add the same number of source-backed memories. Measure initial session indexing, memory writes, a repeated duplicate scan, twenty keyword retrievals with a 1,000-token budget, a bounded session search and Node process RSS. Index timings include transaction work; input objects are generated before the indexing timer. Duplicate scans verify hashes of existing messages without reindexing them.

The quality fixture uses the same three tasks for every approach: token expiry, SQLite contention and production migration approval. Its full transcript contains repeated unrelated conversation and three explicitly authored critical procedures. Compare:

1. **Full conversation:** the whole fixture transcript.
2. **Naive extractive summary:** first five distinct sentences, irrespective of task. This is a deterministic, deliberately simple summary baseline, not an LLM summarizer.
3. **MNEMO retrieval:** source-bearing local context selected for that task, budget 600 estimated tokens.

Tokens use `ceil(UTF-8 bytes / 4)`. Exact provider tokenization, answer correctness, answer latency, semantic-model quality and API cost are **not measured** because no model was invoked. Expected-answer evidence and presence of the critical constraint are checked by exact synthetic fixture strings; they are evidence-retention tests, not an answer-quality evaluation.

## Stored-history performance

| Sessions / memories | Session indexing | Memory writes | Retrieval upper median | Retrieval p95 | Duplicate scan | Node RSS |
|---:|---:|---:|---:|---:|---:|---:|
| 100 / 100 | 59.1 ms | 75.8 ms | 13.8 ms | 19.3 ms | 13.4 ms | 290.4 MiB |
| 1,000 / 1,000 | 487.0 ms | 690.5 ms | 38.9 ms | 89.9 ms | 89.1 ms | 304.1 MiB |
| 10,000 / 10,000 | 8,720.2 ms | 5,806.4 ms | 169.0 ms | 192.5 ms | 909.6 ms | 404.6 MiB |

Bounded session searches took approximately 1.6–1.8 ms in this run. These highly regular fixtures make early matching inexpensive. The process runs the three sizes sequentially; RSS includes the JS runtime, generated fixture objects and earlier allocations. It is not isolated per-dataset heap usage or desktop application RAM.

Retrieval includes baseline transcript token estimation and stored relationships, and currently executes synchronously. The 10,000-history result therefore identifies a real main-thread optimization opportunity. The benchmark was run alongside development/build activity; timings vary with load. No hard latency SLA is asserted.

## Context retention

| Task | Full context tokens | Naive summary tokens | MNEMO tokens | Full: critical constraint | Naive: critical constraint | MNEMO: critical constraint |
|---|---:|---:|---:|---|---|---|
| Authentication expiry | 6,835 | 64 | 84 | Retained | Retained | Retained |
| SQLite lock | 6,835 | 64 | 161 | Retained | Retained | Retained |
| Production migration | 6,835 | 64 | 95 | Retained | Missing | Retained |

Expected action evidence was present for 3/3 full-context tasks, 2/3 naive summaries and 3/3 retrieved bundles. MNEMO used approximately 97.6–98.8% fewer estimated context tokens than this defined full-transcript baseline. The naive summary was smaller than MNEMO, but omitted the production approval constraint. This does not establish generalized token savings, model correctness or superiority over a strong summarizer.

MNEMO retrieval latency in the three-record quality database was approximately 0.91–1.11 ms. All retrieved records keep status, IDs and source references. Larger fixtures, distractor-heavy retrieval evaluations and paid/local-model answer evaluations remain required before broader claims.

## Graph responsiveness

Run `node scripts/desktop-benchmark.mjs`. It seeds actual databases, launches real Electron, loads the graph, waits for nodes and two animation frames, then times a zoom/highlight interaction. Startup includes launching Electron and waiting for the workspace heading. Each dataset has one project linked to its memories.

| Stored memories | Displayed nodes | Startup | Graph ready | Zoom + highlight |
|---:|---:|---:|---:|---:|
| 100 | 101 | 1,950.2 ms | 568.8 ms | 274.2 ms |
| 1,000 | 300 | 1,343.8 ms | 664.2 ms | 381.8 ms |
| 10,000 | 300 | 1,331.8 ms | 650.4 ms | 402.2 ms |

This is a **bounded 300-node view** using loaded records, not evidence that the canvas renders 10,000 nodes. Interaction timings include Playwright action overhead and two-frame synchronization, not frame-time/FPS measurement. Graph clustering/full-data virtualization and deeper performance profiling remain roadmap work.
