/**
 * Factory de LLM Provider
 * Retorna o provider correto com base na configuração do escritório.
 */

import type { LLMProvider, LLMProviderType } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

export function criarLLMProvider(
  tipo: LLMProviderType,
  apiKey: string
): LLMProvider {
  switch (tipo) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "gemini":
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`LLM provider não suportado: ${tipo}`);
  }
}

/**
 * Obtém o LLM provider configurado para um escritório.
 * Busca config no banco e retorna o provider pronto para uso.
 */
export async function obterLLMDoEscritorio(
  escritorioId: string
): Promise<LLMProvider> {
  // Import dinâmico para evitar circular dependency
  const { prisma } = await import("@/lib/prisma");

  const config = await prisma.escritorioConfig.findUnique({
    where: { escritorioId },
  });

  if (!config?.llmApiKey) {
    throw new Error(
      "Escritório não tem LLM configurado. Configure a API key nas configurações."
    );
  }

  return criarLLMProvider(
    config.llmProvider as LLMProviderType,
    config.llmApiKey
  );
}

export type { LLMProvider, LLMProviderType, LLMMessage, LLMOptions, LLMResponse } from "./types";
