/**
 * Agente Extrator
 * Usa LLM (OpenAI/Gemini, selecionável) para extrair dados estruturados de contratos.
 * Fallback para extração regex se LLM não estiver configurado.
 */

import { obterLLMDoEscritorio } from "@/lib/llm/provider";
import { ContratoExtraido } from "@/types/contrato";
import { extrairPrazos } from "@/lib/extrator";

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

/**
 * Extrai dados do contrato usando IA.
 * Se escritorioId não fornecido ou LLM falhar, usa extração regex.
 */
export async function executarAgenteExtrator(
  textoContrato: string,
  escritorioId?: string
): Promise<{ dados: ContratoExtraido; metodo: "ia" | "regex" }> {
  // Tentar extração via IA se escritório configurado
  if (escritorioId) {
    try {
      const llm = await obterLLMDoEscritorio(escritorioId);

      const response = await llm.chat([
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analise o seguinte contrato e extraia os dados estruturados:\n\n${textoContrato}`,
        },
      ]);

      const jsonStr = response.content.trim();
      const parsed = JSON.parse(jsonStr) as ContratoExtraido;
      return { dados: parsed, metodo: "ia" };
    } catch (err) {
      console.warn("[Agente Extrator] Falha na IA, usando regex:", err);
    }
  }

  // Fallback: extração regex
  const dados = extrairPrazos(textoContrato);
  return { dados, metodo: "regex" };
}
