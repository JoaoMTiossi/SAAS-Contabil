/**
 * Cliente compartilhado do Claude / Anthropic SDK
 */

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente para usar os agentes IA."
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export const DEFAULT_MODEL = "claude-sonnet-4-20250514";
