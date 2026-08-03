import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Default when XAI_MODEL is unset.
 * xAI documents `<name>-latest` as a rolling alias within that model family,
 * so minor updates land without code changes. Override with XAI_MODEL to pin
 * a specific slug (e.g. grok-4.5, grok-4.3) or move to a new generation.
 * See https://docs.x.ai/developers/models
 */
export const DEFAULT_XAI_MODEL = "grok-4.5-latest";

export class GrokAgent {
  private client: OpenAI;
  public model: string;

  constructor(model?: string) {
    this.model = model ?? process.env.XAI_MODEL ?? DEFAULT_XAI_MODEL;
    this.client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: process.env.XAI_BASE_URL ?? "https://api.x.ai/v1",
    });
  }

  async chat(messages: any[], tools: any[] = []) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      ...(tools.length > 0 ? { tools, tool_choice: "auto" as const } : {}),
    });
    return response;
  }
}
