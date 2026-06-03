import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type Message = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  tool_call_id?: string;
  name?: string;
  hidden?: boolean;
  [key: string]: any;
};

export class Session {
  public readonly id: string;
  private readonly filePath: string;
  public messages: Message[] = [];

  constructor(id?: string) {
    this.id = id ?? randomUUID();
    this.filePath = path.join(process.cwd(), "sessions", `${this.id}.jsonl`);
  }

  async addMessage(role: Message["role"], content: string, meta: any = {}) {
    const msg: Message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    this.messages.push(msg);

    // save to disk immediately
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, JSON.stringify(msg) + "\n");
  }

  async load() {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      this.messages = data
        .trim()
        .split("\n")
        .map((line: string) => JSON.parse(line));
    } catch (e) {
      // new session
    }
  }

  getHistory() {
    return this.messages;
  }

  // mark messages hidden so toApiMessage skips them
  markHidden(startIndex: number, endIndex: number): void {
    for (let i = startIndex; i <= endIndex; i++) {
      if (this.messages[i]) {
        this.messages[i]!.hidden = true;
      }
    }
  }

  // rewrite JSONL after compaction so hidden flags survive restart
  async rewriteDisk(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const body = this.messages.map((m) => JSON.stringify(m)).join("\n");
    await fs.writeFile(this.filePath, body ? body + "\n" : "", "utf-8");
  }
}
