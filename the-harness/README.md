# The harness

A small TypeScript agent harness that talks to **Grok** (xAI) over the OpenAI-compatible API. It runs in your terminal, keeps conversation history on disk, exposes filesystem tools, and switches behavior with three built-in profiles.

This folder is the **reference implementation** that matches the [Harness 101 tutorial](../tutorial/). If you are learning how harnesses work, follow the tutorial and build your own copy; use this project to compare structure, run experiments, or skip straight to a working loop.

---

## Quick start

From this directory (`the-harness/`):

```bash
cp .env.example .env
# Add your xAI API key to .env

npm install
npm start
```

You need `XAI_API_KEY` in `.env`. The default model is `grok-4.3` in `src/harness/agent.ts` — change it there if you point the client at another compatible endpoint.

At startup you will see the session id, active profile, and allowed tools. Type a prompt at `> `. Press **Enter** on an empty line to quit.

---

## Profiles

Set the profile with `AGENT_PROFILE` before `npm start`:

| Profile | `AGENT_PROFILE` | Tools | Role |
| -------- | ---------------- | ----- | ---- |
| Planner | `planner` | `list_files`, `read_file` | Explore and produce a plan — no writes |
| Implementer | `implementer` (default) | read tools + `write_file`, `delegate` | Make changes; prompts encourage read-before-write |
| Reviewer | `reviewer` | `list_files`, `read_file` | Read-only feedback on the codebase |

Example:

```bash
AGENT_PROFILE=planner npm start
```

Profiles are defined in `src/harness/profiles.ts`. Each profile has its own system prompt and tool allow-list.

---

## Tools

| Tool | Description |
| ----- | ------------- |
| `list_files` | List files under a directory (workspace-relative) |
| `read_file` | Read a file’s full text |
| `write_file` | Write a file (creates parent dirs); result includes a unified diff |
| `delegate` | Spawn a short-lived sub-agent (`planner` or `reviewer` only) in a child session |

Paths are resolved from the **current working directory** (usually `the-harness/` when you run `npm start`). Paths that escape the workspace root are rejected.

---

## Sessions and logs

- **`sessions/`** — One JSONL file per session id. Full message history, including hidden system rows used for turn snapshots and compaction.
- **`logs/`** — Structured harness events for the same session id (`turn_start`, `model_step`, `tool`, `compaction`, etc.).

Both directories are gitignored at runtime. After a run, open the matching files to see what the model saw versus what was only stored for debugging.

---

## How a turn works

1. Your input is appended to the session.
2. **`maybeCompact`** may summarize and hide older visible messages if the thread is long.
3. The **agent loop** (`runTurn` in `src/harness/loop.ts`) runs up to 25 steps: model → tool calls → tool results → repeat until the model returns text without tools.
4. Each loop step records a hidden **turn snapshot** (profile, tool list, message count).
5. **`main.ts`** logs turn boundaries and prints the final reply.

Compaction, diffs on write, and sub-agents are implemented in the capstone modules listed below.

---

## Project layout

```
the-harness/
├── .env.example
├── sessions/          # created at runtime
├── logs/              # created at runtime
└── src/
    ├── main.ts              # CLI REPL
    └── harness/
        ├── agent.ts         # Grok client (OpenAI SDK → api.x.ai)
        ├── session.ts       # JSONL session load/save, hidden messages
        ├── loop.ts          # Agent loop, API message shaping, snapshots
        ├── tools.ts         # Tool schemas, execution, permissions
        ├── profiles.ts      # Planner / implementer / reviewer
        ├── logger.ts        # Console + JSONL event logging
        ├── diff.ts          # Unified diffs for write_file results
        ├── compaction.ts    # Summarize and hide old context
        └── subagent.ts      # delegate → child session + one turn
```

---

## Module reference

### Session (`session.ts`)
- `Session` — `addMessage`, `load`, `getHistory`, `markHidden`, `rewriteDisk`
- Persists to `sessions/<id>.jsonl`
- Hidden messages stay on disk but are stripped before API calls via `toApiMessages` in `loop.ts`

### Agent loop (`loop.ts`)
- `runTurn(session, agent, input, profile, logger)` — main interactive loop
- `toApiMessages` — drops `hidden` and harness-only fields for the model
- Turn snapshots — hidden system lines per loop step

### Tools (`tools.ts`)
- `getToolSchemas`, `executeTool`, `isToolAllowed`
- `write_file` returns character count plus `formatFileDiff` output

### Compaction (`compaction.ts`)
- `maybeCompact` — when visible messages exceed the threshold, summarizes the middle and marks older rows hidden

### Sub-agents (`subagent.ts`)
- `runSubagentTurn` — fresh session, one `runTurn`, used by the `delegate` tool
- Child sessions get their own files under `sessions/` and `logs/`

### Logging (`logger.ts`)
- `HarnessLogger` — structured events to `logs/<session-id>.jsonl` and short previews on the console

---

## Scripts

| Command | What it does |
| -------- | -------------- |
| `npm start` | Run the interactive harness (`tsx src/main.ts`) |

---

## Going further

Ideas for improvements, known limits, and a prioritized backlog: [FUTURE-PLANS-AND-UPDATES.md](./FUTURE-PLANS-AND-UPDATES.md).

Tutorial (build it yourself): [../tutorial/](../tutorial/)
