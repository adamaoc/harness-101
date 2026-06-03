import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export class GrokAgent {
  private client: OpenAI;
  public model = "grok-4.3";

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
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
