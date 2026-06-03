import fs from "fs/promises";
import path from "path";

/** Shorten tool results for logs — avoid dumping whole files. */
export function preview(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

export class HarnessLogger {
  private readonly logPath: string;

  constructor(sessionId: string) {
    this.logPath = path.join(process.cwd(), "logs", `${sessionId}.jsonl`);
  }

  async event(
    kind: string,
    fields: Record<string, unknown> = {},
  ): Promise<void> {
    const record = {
      ts: new Date().toISOString(),
      kind,
      ...fields,
    };

    console.log(this.formatConsole(record));
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    await fs.appendFile(this.logPath, JSON.stringify(record) + "\n");
  }

  private formatConsole(record: Record<string, unknown>): string {
    const { ts, kind, ...rest } = record;
    const parts = Object.entries(rest).map(
      ([key, value]) =>
        `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`,
    );
    return `[harness] ${kind}${parts.length ? " " + parts.join(" ") : ""}`;
  }
}
