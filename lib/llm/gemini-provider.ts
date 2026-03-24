import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMMessage, LLMOptions } from "./types";

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey: string, model?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModel = model || "gemini-1.5-flash";
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: options?.model || this.defaultModel,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 2048,
      },
    });

    const systemMsg = messages.find((m) => m.role === "system");
    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

    const lastMsg = history.pop();
    if (!lastMsg) return "";

    const chat = model.startChat({
      history,
      ...(systemMsg ? { systemInstruction: { role: "user" as const, parts: [{ text: systemMsg.content }] } } : {}),
    });

    try {
      const result = await chat.sendMessage(lastMsg.parts[0].text);
      return result.response.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Gemini API call failed: ${message}`);
    }
  }

  getName(): string {
    return "gemini";
  }
}
