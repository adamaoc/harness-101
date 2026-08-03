import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export class GrokAgent {
  private client: OpenAI;
  /** Model id sent to the API. Default `"latest"` is xAI's rolling flagship alias. */
  public model: string;

  constructor(model?: string) {
    // Prefer explicit override, then env, else xAI's unversioned "latest" alias.
    // See request examples at https://docs.x.ai/docs/api-reference
    this.model = model ?? process.env.XAI_MODEL ?? "latest";
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
