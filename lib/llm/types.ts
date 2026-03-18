/**
 * Tipos compartilhados do sistema de LLM
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsados?: number;
}

export interface LLMProvider {
  getName(): string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

export type LLMProviderType = "openai" | "gemini";
