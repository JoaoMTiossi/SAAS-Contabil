/**
 * Agente Gestão de Contratos
 * Versionamento, timeline, busca, categorização e análise por IA.
 */

import { prisma } from "@/lib/prisma";
import { obterLLMDoEscritorio } from "@/lib/llm/provider";

// ─── Busca e Listagem ────────────────────────────────────────────

export interface FiltrosContrato {
  clienteId?: string;
  status?: string;
  tags?: string[];
  busca?: string;
  pagina?: number;
  porPagina?: number;
}

export async function listarContratos(
  clienteIds: string[],
  filtros: FiltrosContrato
) {
  const pagina = filtros.pagina ?? 1;
  const porPagina = filtros.porPagina ?? 20;

  const where: Record<string, unknown> = {
    clienteId: { in: clienteIds },
  };

  if (filtros.status) where.status = filtros.status;
  if (filtros.clienteId) where.clienteId = filtros.clienteId;
  if (filtros.tags?.length) where.tags = { hasSome: filtros.tags };
  if (filtros.busca) {
    where.OR = [
      { identificador: { contains: filtros.busca, mode: "insensitive" } },
      { contratante: { contains: filtros.busca, mode: "insensitive" } },
      { contratado: { contains: filtros.busca, mode: "insensitive" } },
      { textoOriginal: { contains: filtros.busca, mode: "insensitive" } },
    ];
  }

  const [total, contratos] = await Promise.all([
    prisma.contrato.count({ where }),
    prisma.contrato.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        cliente: { select: { razaoSocial: true } },
        _count: { select: { parcelas: true, obrigacoes: true, alertas: true } },
      },
    }),
  ]);

  return { total, pagina, porPagina, contratos };
}

// ─── Versionamento ───────────────────────────────────────────────

export async function criarVersao(data: {
  contratoId: string;
  tipo: "original" | "aditivo" | "reajuste" | "correcao";
  descricao?: string;
  conteudo: string;
  criadoPorId?: string;
}) {
  // Obter próximo número de versão
  const ultimaVersao = await prisma.contratoVersao.findFirst({
    where: { contratoId: data.contratoId },
    orderBy: { versao: "desc" },
  });

  const versao = (ultimaVersao?.versao ?? 0) + 1;

  const novaVersao = await prisma.contratoVersao.create({
    data: {
      contratoId: data.contratoId,
      versao,
      tipo: data.tipo,
      descricao: data.descricao,
      conteudo: data.conteudo,
      criadoPorId: data.criadoPorId,
    },
  });

  // Registrar evento
  await registrarEvento(
    data.contratoId,
    data.tipo,
    `Versão ${versao} criada: ${data.descricao ?? data.tipo}`
  );

  return novaVersao;
}

export async function listarVersoes(contratoId: string) {
  return prisma.contratoVersao.findMany({
    where: { contratoId },
    orderBy: { versao: "desc" },
  });
}

// ─── Timeline de Eventos ─────────────────────────────────────────

export async function registrarEvento(
  contratoId: string,
  tipo: string,
  descricao: string
) {
  return prisma.contratoEvento.create({
    data: { contratoId, tipo, descricao },
  });
}

export async function obterTimeline(contratoId: string) {
  return prisma.contratoEvento.findMany({
    where: { contratoId },
    orderBy: { criadoEm: "desc" },
  });
}

// ─── IA: Análise de Contrato ─────────────────────────────────────

const SYSTEM_PROMPT_ANALISE = `Você é um analista jurídico-contábil especializado em contratos brasileiros.
Analise o contrato e retorne APENAS um JSON válido (sem markdown):

{
  "resumo": "Resumo executivo em 2-3 frases",
  "riscos": [
    { "descricao": "...", "severidade": "alta|media|baixa", "recomendacao": "..." }
  ],
  "clausulas_importantes": [
    { "tipo": "multa|rescisão|renovação|confidencialidade|garantia|outro", "descricao": "...", "impacto": "..." }
  ],
  "pontos_atencao": ["..."],
  "score_risco": 42
}`;

export interface AnaliseContrato {
  resumo: string;
  riscos: Array<{ descricao: string; severidade: string; recomendacao: string }>;
  clausulas_importantes: Array<{ tipo: string; descricao: string; impacto: string }>;
  pontos_atencao: string[];
  score_risco: number;
}

export async function analisarContrato(
  escritorioId: string,
  textoContrato: string
): Promise<AnaliseContrato> {
  const llm = await obterLLMDoEscritorio(escritorioId);

  const response = await llm.chat([
    { role: "system", content: SYSTEM_PROMPT_ANALISE },
    { role: "user", content: `Analise o seguinte contrato:\n\n${textoContrato}` },
  ]);

  return JSON.parse(response.content) as AnaliseContrato;
}
