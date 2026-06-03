import { Session } from "./session.js";
import { GrokAgent } from "./agent.js";
import { runTurn } from "./loop.js";
import { getProfile, type ProfileId } from "./profiles.js";
import { HarnessLogger } from "./logger.js";

export type DelegateResult = {
  childSessionId: string;
  profileId: ProfileId;
  reply: string;
};

/**
 * Run one turn in a fresh session — used by the parent agent's delegate tool.
 */
export async function runSubagentTurn(
  task: string,
  profileId: ProfileId,
  parentSessionId: string,
): Promise<DelegateResult> {
  const profile = getProfile(profileId);
  const session = new Session();
  await session.load();

  await session.addMessage("system", profile.systemPrompt);
  await session.addMessage(
    "system",
    `You are a sub-agent spawned by parent session ${parentSessionId}. ` +
      "Complete only the task below, then stop.",
    { hidden: true },
  );

  const agent = new GrokAgent();
  const logger = new HarnessLogger(session.id);

  const reply = await runTurn(session, agent, task, profile, logger);

  return {
    childSessionId: session.id,
    profileId,
    reply,
  };
}
