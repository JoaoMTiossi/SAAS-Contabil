export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMProvider {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  getName(): string;
}
