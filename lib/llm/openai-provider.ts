/**
 * Provider OpenAI (GPT-4o, GPT-4, etc.)
 */

import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from "./types";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getName(): string {
    return "openai";
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const model = options?.model ?? DEFAULT_MODEL;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error("OpenAI retornou resposta vazia.");
    }

    return {
      content: choice.message.content,
      model: data.model ?? model,
      tokensUsados: data.usage?.total_tokens,
    };
  }
}
