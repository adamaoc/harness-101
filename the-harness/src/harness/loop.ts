import type { Message } from "./session.js";
import type { Session } from "./session.js";
import type { GrokAgent } from "./agent.js";
import type { AgentProfile } from "./profiles.js";
import { getToolSchemas, executeTool } from "./tools.js";
import { HarnessLogger, preview } from "./logger.js";
import { maybeCompact } from "./compaction.js";

const MAX_ITERATIONS = 25;

/** Strip harness-only messages and fields before sending history to the API. */
export function toApiMessages(messages: Message[]): Record<string, unknown>[] {
  return messages
    .filter((m) => !m.hidden)
    .map(({ timestamp, hidden, ...rest }) => rest);
}

type TurnSnapshot = {
  step: number;
  profileId: string;
  messageCount: number;
  toolsAvailable: string[];
  workingDir: string;
  timestamp: string;
};

async function recordTurnSnapshot(
  session: Session,
  step: number,
  profile: AgentProfile,
): Promise<void> {
  const toolSchemas = getToolSchemas(profile.allowedTools);
  const snapshot: TurnSnapshot = {
    step,
    profileId: profile.id,
    messageCount: session.getHistory().length,
    toolsAvailable: toolSchemas.map((t) => t.function.name),
    workingDir: process.cwd(),
    timestamp: new Date().toISOString(),
  };

  await session.addMessage(
    "system",
    `TURN SNAPSHOT: ${JSON.stringify(snapshot)}`,
    { hidden: true },
  );
}

// run one user turn.
// returns final text answer
export async function runTurn(
  session: Session,
  agent: GrokAgent,
  userInput: string,
  profile: AgentProfile,
  logger: HarnessLogger,
): Promise<string> {
  const toolSchemas = getToolSchemas(profile.allowedTools);

  await session.addMessage("user", userInput);
  await maybeCompact(session, agent, logger);

  for (let step = 0; step < MAX_ITERATIONS; step++) {
    await recordTurnSnapshot(session, step, profile);

    const modelStarted = Date.now();

    const response = await agent.chat(
      toApiMessages(session.getHistory()),
      toolSchemas,
    );

    const message = response.choices[0]?.message;

    if (!message) {
      throw new Error("Model returned no message");
    }

    const toolCalls = message.tool_calls ?? [];

    const usage = response.usage;

    await logger.event("model_step", {
      step,
      profileId: profile.id,
      durationMs: Date.now() - modelStarted,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      toolCallCount: toolCalls.length,
    });

    if (toolCalls.length > 0) {
      await session.addMessage("assistant", message.content ?? "", {
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;
        const fn = toolCall.function;

        const toolStarted = Date.now();
        const result = await executeTool(
          fn.name,
          fn.arguments,
          profile.allowedTools,
          session.id,
        );

        const denied = result.startsWith("Permission denied.");

        await logger.event("tool", {
          step,
          name: fn.name,
          durationMs: Date.now() - toolStarted,
          denied,
          resultPreview: preview(result),
        });

        await session.addMessage("tool", result, {
          tool_call_id: toolCall.id,
          name: fn.name,
        });
      }
      continue;
    }
    const text = message.content ?? "";
    await session.addMessage("assistant", text);

    return text;
  }
  throw new Error(`Agent loop exceeded ${MAX_ITERATIONS} iterations`);
}
