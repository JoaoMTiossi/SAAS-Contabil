import OpenAI from "openai";
import type { LLMProvider, LLMMessage, LLMOptions } from "./types";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.defaultModel = model || "gpt-4o-mini";
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  getName(): string {
    return "openai";
  }
}
