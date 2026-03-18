/**
 * Agente Geração de Contratos
 * Gera contratos a partir de templates com variáveis preenchidas.
 * Suporte a IA para sugestão de cláusulas.
 */

import { prisma } from "@/lib/prisma";
import { obterLLMDoEscritorio } from "@/lib/llm/provider";

// ─── Template Engine ─────────────────────────────────────────────

/**
 * Substitui variáveis {{nome}} no template pelo valor correspondente.
 */
export function preencherTemplate(
  template: string,
  variaveis: Record<string, string>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, chave) => {
    // Suporta chaves aninhadas: {{cliente.razaoSocial}}
    const partes = chave.split(".");
    let valor: unknown = variaveis;
    for (const parte of partes) {
      if (valor && typeof valor === "object") {
        valor = (valor as Record<string, unknown>)[parte];
      } else {
        return match; // Mantém a variável se não encontrar
      }
    }
    return typeof valor === "string" ? valor : match;
  });
}

// ─── CRUD Templates ──────────────────────────────────────────────

export async function listarTemplates(escritorioId: string) {
  return prisma.templateContrato.findMany({
    where: {
      OR: [
        { escritorioId },
        { escritorioId: null }, // templates globais
      ],
      ativo: true,
    },
    orderBy: { nome: "asc" },
  });
}

export async function obterTemplate(id: string) {
  return prisma.templateContrato.findUnique({ where: { id } });
}

export async function criarTemplate(data: {
  escritorioId: string;
  nome: string;
  tipo: "prestacao_servicos" | "consultoria" | "bpo" | "aditivo" | "distrato" | "custom";
  conteudo: string;
  variaveis?: string[];
}) {
  return prisma.templateContrato.create({
    data: {
      escritorioId: data.escritorioId,
      nome: data.nome,
      tipo: data.tipo,
      conteudo: data.conteudo,
      variaveis: data.variaveis ?? [],
    },
  });
}

// ─── Geração de Contrato ─────────────────────────────────────────

export interface GerarContratoInput {
  templateId: string;
  variaveis: Record<string, string>;
  clienteId?: string;
}

export interface ContratoGerado {
  conteudo: string;
  templateNome: string;
  variaveis: Record<string, string>;
}

export async function gerarContrato(
  input: GerarContratoInput
): Promise<ContratoGerado> {
  const template = await prisma.templateContrato.findUnique({
    where: { id: input.templateId },
  });

  if (!template) {
    throw new Error("Template não encontrado.");
  }

  const conteudo = preencherTemplate(template.conteudo, input.variaveis);

  return {
    conteudo,
    templateNome: template.nome,
    variaveis: input.variaveis,
  };
}

// ─── IA: Sugestão de Cláusulas ──────────────────────────────────

const SYSTEM_PROMPT_CLAUSULAS = `Você é um assistente jurídico especializado em contratos de prestação de serviços contábeis no Brasil.
Dado o contexto do contrato, sugira cláusulas adicionais relevantes.

Retorne APENAS um JSON válido (sem markdown) com a estrutura:
{
  "clausulas": [
    {
      "titulo": "Título da cláusula",
      "texto": "Texto completo da cláusula",
      "motivo": "Por que esta cláusula é importante"
    }
  ]
}

Regras:
- Sugira entre 2 e 5 cláusulas
- Foque em proteção jurídica para ambas as partes
- Use linguagem jurídica formal brasileira
- Considere a LGPD quando aplicável`;

export interface ClausulaSugerida {
  titulo: string;
  texto: string;
  motivo: string;
}

export async function sugerirClausulas(
  escritorioId: string,
  contexto: string
): Promise<ClausulaSugerida[]> {
  const llm = await obterLLMDoEscritorio(escritorioId);

  const response = await llm.chat([
    { role: "system", content: SYSTEM_PROMPT_CLAUSULAS },
    {
      role: "user",
      content: `Contexto do contrato:\n${contexto}\n\nSugira cláusulas adicionais relevantes.`,
    },
  ]);

  const parsed = JSON.parse(response.content);
  return parsed.clausulas as ClausulaSugerida[];
}
