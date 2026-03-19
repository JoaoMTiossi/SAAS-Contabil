import { prisma } from "@/lib/prisma";
import type { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

export async function getLLMProvider(escritorioId: string): Promise<LLMProvider | null> {
  const config = await prisma.escritorioConfig.findUnique({
    where: { escritorioId },
  });

  if (!config?.llmApiKey) return null;

  switch (config.llmProvider) {
    case "openai":
      return new OpenAIProvider(config.llmApiKey, config.llmModel ?? undefined);
    case "gemini":
      return new GeminiProvider(config.llmApiKey, config.llmModel ?? undefined);
    default:
      return null;
  }
}

export type { LLMProvider, LLMMessage, LLMOptions } from "./types";
