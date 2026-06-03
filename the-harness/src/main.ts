import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { GrokAgent } from "./harness/agent.js";
import { Session } from "./harness/session.js";
import { runTurn } from "./harness/loop.js";
import { resolveProfileId, getProfile } from "./harness/profiles.js";
import { HarnessLogger } from "./harness/logger.js";

async function main() {
  const profileId = resolveProfileId(process.env.AGENT_PROFILE);
  const profile = getProfile(profileId);

  const session = new Session();
  await session.load();
  const agent = new GrokAgent();
  const logger = new HarnessLogger(session.id);

  if (session.getHistory().length === 0) {
    await session.addMessage("system", profile.systemPrompt);
  }

  console.log(`Session ${session.id}`);
  console.log(`Profile: ${profile.label}`);
  console.log(`Allowed tools: ${profile.allowedTools.join(", ")}`);
  console.log("Empty line to quit\n");

  const rl = readline.createInterface({ input, output });

  while (true) {
    const line = await rl.question("> ");
    if (!line.trim()) break;

    const turnStarted = Date.now();

    await logger.event("turn_start", {
      profileId: profile.id,
      inputChars: line.length,
    });

    try {
      const reply = await runTurn(session, agent, line, profile, logger);

      await logger.event("turn_end", {
        profileId: profile.id,
        durationMs: Date.now() - turnStarted,
        status: "ok",
        replyChars: reply.length,
      });

      console.log(`\n${reply}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await logger.event("turn_error", {
        profileId: profile.id,
        durationMs: Date.now() - turnStarted,
        status: "error",
        message,
      });

      console.error(err);
    }
  }

  rl.close();
}

main().catch(console.error);
