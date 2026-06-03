import type { Session } from "./session.js";
import type { GrokAgent } from "./agent.js";
import type { HarnessLogger } from "./logger.js";

/** When visible messages exceed this, compact the middle. */
const COMPACT_WHEN_VISIBLE_OVER = 30;

/** Keep this many newest visible messages after compacting. */
const KEEP_RECENT_VISIBLE = 12;

export async function maybeCompact(
  session: Session,
  agent: GrokAgent,
  logger: HarnessLogger,
): Promise<void> {
  const visible = session.getHistory().filter((m) => !m.hidden);

  if (visible.length <= COMPACT_WHEN_VISIBLE_OVER) {
    return;
  }

  // Keep first visible message (usually system) + recent tail; summarize the middle.
  const middle = visible.slice(1, visible.length - KEEP_RECENT_VISIBLE);

  if (middle.length === 0) {
    return;
  }

  const transcript = middle
    .map((m) => `[${m.role}] ${m.content}`.slice(0, 500))
    .join("\n");

  const summarizePrompt =
    "Summarize this agent conversation for future turns. " +
    "Keep: user goals, files touched, decisions, errors, open tasks. " +
    "Drop: pleasantries and repeated tool output. Under 400 words.\n\n" +
    transcript;

  const started = Date.now();
  const response = await agent.chat(
    [{ role: "user", content: summarizePrompt }],
    [],
  );

  const summary =
    response.choices[0]?.message?.content?.trim() ?? "(empty summary)";

  await logger.event("compaction", {
    hiddenCount: middle.length,
    keptRecent: KEEP_RECENT_VISIBLE,
    durationMs: Date.now() - started,
    summaryChars: summary.length,
  });

  // hide middle messages
  const history = session.getHistory();
  for (const msg of middle) {
    const idx = history.indexOf(msg);
    if (idx >= 0) {
      session.markHidden(idx, idx);
    }
  }

  await session.addMessage(
    "system",
    `COMPACTED HISTORY (${middle.length} messages summarized):\n${summary}`,
    { hidden: false },
  );

  await session.rewriteDisk();
}
