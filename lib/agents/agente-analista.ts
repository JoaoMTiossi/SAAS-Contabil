/**
 * Agente Analista
 * Analisa contratos para identificar riscos, cláusulas importantes e recomendações.
 */

import { getClaudeClient, DEFAULT_MODEL } from "./claude-client";
import { ContratoExtraido } from "@/types/contrato";

export interface AnaliseContrato {
  resumo: string;
  riscos: Array<{
    descricao: string;
    severidade: "alta" | "media" | "baixa";
    recomendacao: string;
  }>;
  clausulas_importantes: Array<{
    tipo: string;
    descricao: string;
    impacto: string;
  }>;
  pontos_atencao: string[];
  score_risco: number; // 0-100
}

const SYSTEM_PROMPT = `Você é um agente analista jurídico-contábil especializado em contratos brasileiros.
Sua tarefa é analisar um contrato (texto original + dados extraídos) e produzir uma análise de riscos.

Você DEVE retornar APENAS um JSON válido (sem markdown, sem explicações) com a seguinte estrutura:

{
  "resumo": "Resumo executivo do contrato em 2-3 frases",
  "riscos": [
    {
      "descricao": "Descrição do risco",
      "severidade": "alta" | "media" | "baixa",
      "recomendacao": "O que fazer para mitigar"
    }
  ],
  "clausulas_importantes": [
    {
      "tipo": "multa|rescisão|renovação|confidencialidade|garantia|outro",
      "descricao": "Descrição da cláusula",
      "impacto": "Impacto prático para o contratante"
    }
  ],
  "pontos_atencao": ["Lista de pontos que precisam de atenção imediata"],
  "score_risco": 42
}

Regras:
- score_risco: 0 = sem risco, 100 = risco máximo
- Avalie multas por atraso, cláusulas de rescisão, prazos apertados
- Identifique obrigações com prazos curtos ou penalidades severas
- Destaque cláusulas de renovação automática como ponto de atenção
- Considere riscos de fluxo de caixa com base nas parcelas
- Seja objetivo e prático nas recomendações`;

export async function executarAgenteAnalista(
  textoContrato: string,
  dadosExtraidos: ContratoExtraido
): Promise<AnaliseContrato> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analise o seguinte contrato:

TEXTO DO CONTRATO:
${textoContrato}

DADOS EXTRAÍDOS:
${JSON.stringify(dadosExtraidos, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Agente Analista não retornou resposta de texto.");
  }

  const jsonStr = textBlock.text.trim();
  return JSON.parse(jsonStr) as AnaliseContrato;
}
