/**
 * Agente de Alertas Inteligentes
 * Gera sugestões de alertas personalizados com base na análise do contrato.
 * Complementa a régua fixa de alertas com alertas contextuais.
 */

import { getClaudeClient, DEFAULT_MODEL } from "./claude-client";
import { ContratoExtraido } from "@/types/contrato";
import { AnaliseContrato } from "./agente-analista";

export interface AlertaInteligente {
  tipo: "vencimento_geral" | "parcela" | "obrigacao" | "renovacao" | "risco" | "acao_recomendada";
  descricao: string;
  data_sugerida: string; // DD/MM/AAAA
  prioridade: "info" | "atencao" | "urgente" | "critico";
  motivo: string;
  canais: string[];
}

export interface SugestoesAlertas {
  alertas_extras: AlertaInteligente[];
  explicacao: string;
}

const SYSTEM_PROMPT = `Você é um agente especialista em gestão de prazos contratuais.
Sua tarefa é sugerir alertas inteligentes ALÉM da régua padrão (30d, 15d, 7d, 1d, 0d).

A régua padrão já gera alertas automáticos para vencimentos, parcelas e obrigações.
Você deve sugerir alertas ADICIONAIS baseados na análise de riscos e contexto do contrato.

Você DEVE retornar APENAS um JSON válido (sem markdown, sem explicações) com a estrutura:

{
  "alertas_extras": [
    {
      "tipo": "risco" | "acao_recomendada" | "vencimento_geral" | "parcela" | "obrigacao" | "renovacao",
      "descricao": "Descrição clara do alerta",
      "data_sugerida": "DD/MM/AAAA",
      "prioridade": "info" | "atencao" | "urgente" | "critico",
      "motivo": "Por que este alerta é necessário",
      "canais": ["email", "dashboard"]
    }
  ],
  "explicacao": "Explicação geral sobre a estratégia de alertas sugerida"
}

Exemplos de alertas inteligentes:
- "Preparar documentação para renovação" (60 dias antes do vencimento)
- "Revisar fluxo de caixa: 3 parcelas concentradas neste mês"
- "Prazo de entrega de obrigação X se aproxima — iniciar agora"
- "Cláusula de multa: garantir pagamento pontual da parcela Y"
- "Avaliar se vale renovar o contrato" (90 dias antes)

Regras:
- Sugira entre 0 e 5 alertas extras (não repita a régua padrão)
- Datas no formato DD/MM/AAAA
- Seja prático e acionável nas descrições
- Considere os riscos identificados pelo agente analista
- Foque em ações preventivas, não apenas avisos`;

export async function executarAgenteAlertas(
  dadosExtraidos: ContratoExtraido,
  analise: AnaliseContrato
): Promise<SugestoesAlertas> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Com base nos dados do contrato e na análise de riscos, sugira alertas inteligentes:

DADOS DO CONTRATO:
${JSON.stringify(dadosExtraidos, null, 2)}

ANÁLISE DE RISCOS:
${JSON.stringify(analise, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Agente de Alertas não retornou resposta de texto.");
  }

  const jsonStr = textBlock.text.trim();
  return JSON.parse(jsonStr) as SugestoesAlertas;
}
