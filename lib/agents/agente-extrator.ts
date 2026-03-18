/**
 * Agente Extrator
 * Usa Claude para extrair dados estruturados de contratos.
 * Substitui/complementa a extração baseada em regex com compreensão semântica.
 */

import { getClaudeClient, DEFAULT_MODEL } from "./claude-client";
import { ContratoExtraido } from "@/types/contrato";

const SYSTEM_PROMPT = `Você é um agente especialista em extração de dados de contratos brasileiros.
Sua tarefa é analisar o texto de um contrato e extrair informações estruturadas.

Você DEVE retornar APENAS um JSON válido (sem markdown, sem explicações) com a seguinte estrutura:

{
  "contrato": {
    "identificador": "string ou null",
    "partes": {
      "contratante": "string ou null",
      "contratado": "string ou null"
    }
  },
  "vencimento_geral": {
    "data_inicio": "DD/MM/AAAA ou null",
    "data_fim": "DD/MM/AAAA ou null",
    "renovacao_automatica": true/false/null,
    "prazo_aviso_cancelamento": "DD/MM/AAAA ou null"
  },
  "parcelas": [
    {
      "numero": 1,
      "descricao": "string ou null",
      "valor": "R$ 1.000,00 ou null",
      "vencimento": "DD/MM/AAAA ou null",
      "status": "pendente"
    }
  ],
  "obrigacoes": [
    {
      "descricao": "string",
      "responsavel": "contratante" | "contratado" | null,
      "prazo": "DD/MM/AAAA ou null",
      "status": "pendente"
    }
  ],
  "confianca": {
    "vencimento_geral": "alta" | "media" | "baixa",
    "parcelas": "alta" | "media" | "baixa",
    "obrigacoes": "alta" | "media" | "baixa"
  }
}

Regras:
- Datas sempre no formato DD/MM/AAAA
- Valores monetários no formato "R$ 1.000,00"
- Se não encontrar uma informação, use null
- Avalie a confiança com base na clareza do texto
- Extraia TODAS as parcelas e obrigações mencionadas
- Identifique corretamente contratante vs contratado
- Detecte cláusulas de renovação automática`;

export async function executarAgenteExtrator(
  textoContrato: string
): Promise<ContratoExtraido> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analise o seguinte contrato e extraia os dados estruturados:\n\n${textoContrato}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Agente Extrator não retornou resposta de texto.");
  }

  const jsonStr = textBlock.text.trim();
  const parsed = JSON.parse(jsonStr) as ContratoExtraido;

  return parsed;
}
