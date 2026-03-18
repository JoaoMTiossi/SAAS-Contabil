/**
 * Agente Geração de Contratos
 * Gera contratos a partir de templates com variáveis preenchidas.
 */

import { prisma } from "@/lib/prisma";

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
