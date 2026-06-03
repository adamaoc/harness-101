# Future plans and updates

A living backlog for this harness — what works today, what’s intentionally simple, and what you might add next. Pair this with the [tutorial](../tutorial/) if you are learning; use this file if you are extending the reference copy in `the-harness/`.

---

## Current state

| Area | Status |
|------|--------|
| Durable sessions (`sessions/*.jsonl`) | Working |
| Grok agent loop (max 25 steps per user turn) | Working |
| Tools: `list_files`, `read_file`, `write_file`, `delegate` | Working |
| Profiles: planner / implementer / reviewer (`AGENT_PROFILE`) | Working |
| Turn snapshots (hidden system messages) | Working |
| Structured harness logs (`logs/*.jsonl`) | Working |
| Diff preview on `write_file` | Working |
| Compaction when visible message count is high | Working |
| Sub-agents (`delegate` + `runSubagentTurn`) | Implemented — worth a dedicated test run |
| CLI: profile at startup, empty line quits | Working |

Details on each module: [README.md](./README.md).

---

## Known limits

These are design boundaries for a teaching harness, not necessarily bugs.

1. **Compaction runs once per user turn** (before the loop), not mid-turn. One heavy turn can still spike tokens (many `read_file` calls before a single `write_file`).
2. **Compaction hides messages from the API** via `hidden` + `toApiMessages`, but **JSONL on disk keeps full tool payloads** — sessions grow large; good for debugging, watch disk on long runs.
3. **`write_file` applies immediately** — the diff is reported after the write, not shown for approval first.
4. **Turn snapshots every loop step** add hidden messages and can push you toward the compaction threshold sooner.
5. **Sub-agents** have no depth counter yet; planner/reviewer profiles omit `delegate`, which limits recursion in practice.

---

## Roadmap (prioritized)

### Near term — try what you already have

- [ ] **Plan → implement → review** — run with `AGENT_PROFILE=planner`, paste the plan into a new or continued session as implementer, then run reviewer on the result.
- [ ] **`delegate` smoke test** — e.g. ask the implementer to delegate a reviewer pass on `src/harness/loop.ts`; confirm a child `sessions/<id>.jsonl` and a parent tool result starting with `Sub-agent`.
- [ ] **Audit `turn_end` events** — ensure turn lifecycle logging lives in one place (`main.ts` vs `loop.ts`) so logs are not duplicated.

### Context and cost

- [ ] **Truncate tool results for the API only** — keep full content in session JSONL; send shortened bodies in `toApiMessages` to slow token growth after compaction.
- [ ] **Optional mid-turn compaction** — if token usage from `model_step` logs crosses a threshold inside the loop, run a lighter compact pass.
- [ ] **Separate compaction model** — env var for a smaller/cheaper model used only in `maybeCompact`.
- [ ] **Tune thresholds** — adjust `COMPACT_WHEN_VISIBLE_OVER` and `KEEP_RECENT_VISIBLE` in `compaction.ts` using `grep` on `logs/*.jsonl` and `promptTokens` trends.

### Safety and editing

- [ ] **Two-phase edits** — `propose_edit` (diff only) + `apply_edit` or CLI confirmation before disk writes.
- [ ] **Patch-based writes** — apply unified diff hunks instead of replacing whole files when the model sends a patch.
- [ ] **Read-before-write in code** — track paths read this turn; warn or deny `write_file` on unread paths (stricter than prompt-only rules).

### Observability and ops

- [ ] **Structured tool errors** — `{ ok, code, message }` from `executeTool` instead of string prefix matching for denials in the logger.
- [ ] **Export logs** — optional JSONL → OpenTelemetry or a simple HTTP sink (same event shape as today).
- [ ] **Session picker** — resume with `SESSION_ID=...` instead of always starting a new UUID.

### Workflow

- [ ] **Scripted multi-profile run** — e.g. `npm run workflow` that chains planner → implementer → reviewer with a handoff file between steps.
- [ ] **Sub-agent depth limit** — pass `depth` into `runSubagentTurn`; refuse `delegate` when depth exceeds 1.

### Tooling and quality

- [ ] **One external tool integration** — e.g. a single MCP server or HTTP tool when file tools are not enough.
- [ ] **Git checkpoints** — stash or commit before implementer turns; add a rollback command.
- [ ] **Tighter implementer scope in prompts** — optional guard so the agent does not rewrite unrelated files (e.g. tutorial HTML) unless asked.
- [ ] **Tests** — Vitest smoke tests for `executeTool` permissions, `formatFileDiff`, `toApiMessages` hidden filter, `maybeCompact` threshold (mock `agent.chat`).

### Probably out of scope for this repo

Full permission rule engines, terminal UIs, multi-provider routing, plugin systems, and remote sandboxes are worth studying elsewhere — this project stays small on purpose.

---

## Metrics to watch

Use your session’s log file under `logs/`:

```bash
# Token trend per turn
grep '"kind":"model_step"' logs/<session-id>.jsonl

# When compaction ran
grep '"kind":"compaction"' logs/<session-id>.jsonl

# Permission denials
grep '"denied":true' logs/<session-id>.jsonl

# Loop depth (many model_step lines → heavy turn)
grep '"kind":"model_step"' logs/<session-id>.jsonl | wc -l
```

**Healthy signals:** `toolCallCount` 0 on the final step of a turn; `denied: false`; compaction before context errors.

**Warning signals:** `promptTokens` climbing every turn after compact; the same file `read_file` twice in one step; `write_file` without a prior read in the same turn.

---

## Capstone file map

| File | Role |
|------|------|
| `src/harness/diff.ts` | Unified diff for write results |
| `src/harness/compaction.ts` | Summarize + hide old messages |
| `src/harness/subagent.ts` | Child session, one `runTurn` |
| `src/harness/session.ts` | `markHidden`, `rewriteDisk` |
| `src/harness/tools.ts` | Diff on write, `delegate` tool |
| `src/harness/loop.ts` | `maybeCompact`, passes `session.id` into `executeTool` |
