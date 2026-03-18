/**
 * Agente Cobrança de Honorários
 * Controle financeiro: honorários, lançamentos, inadimplência, relatórios.
 * Sem gateway de pagamento — apenas registro e acompanhamento.
 */

import { prisma } from "@/lib/prisma";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  format,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import { enviarNotificacao } from "@/lib/notificacoes/engine";

// ─── CRUD Honorários ─────────────────────────────────────────────

export async function criarHonorario(data: {
  clienteId: string;
  contratoId?: string;
  valor: number;
  periodicidade?: "mensal" | "trimestral" | "anual";
  diaVencimento: number;
  indiceReajuste?: string;
  percentualReajuste?: number;
}) {
  return prisma.honorario.create({
    data: {
      clienteId: data.clienteId,
      contratoId: data.contratoId,
      valor: data.valor,
      periodicidade: data.periodicidade ?? "mensal",
      diaVencimento: data.diaVencimento,
      indiceReajuste: data.indiceReajuste,
      percentualReajuste: data.percentualReajuste,
    },
  });
}

export async function listarHonorarios(clienteIds: string[]) {
  return prisma.honorario.findMany({
    where: { clienteId: { in: clienteIds }, ativo: true },
    include: {
      cliente: { select: { razaoSocial: true } },
      _count: { select: { lancamentos: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Geração de Lançamentos ──────────────────────────────────────

/**
 * Gera lançamentos do mês para todos os honorários ativos.
 * Evita duplicatas verificando a competência.
 */
export async function gerarLancamentosMes(
  clienteIds: string[],
  competencia?: string
): Promise<number> {
  const comp = competencia ?? format(new Date(), "yyyy-MM");
  const [ano, mes] = comp.split("-").map(Number);

  const honorarios = await prisma.honorario.findMany({
    where: { clienteId: { in: clienteIds }, ativo: true },
  });

  let criados = 0;

  for (const h of honorarios) {
    // Verificar se já existe lançamento para esta competência
    const existente = await prisma.lancamentoHonorario.findFirst({
      where: { honorarioId: h.id, competencia: comp },
    });

    if (existente) continue;

    // Calcular data de vencimento
    const dia = Math.min(h.diaVencimento, 28); // Evita dia inválido
    const vencimento = new Date(ano, mes - 1, dia);

    await prisma.lancamentoHonorario.create({
      data: {
        honorarioId: h.id,
        competencia: comp,
        valor: h.valor,
        vencimento,
      },
    });

    criados++;
  }

  return criados;
}

// ─── Registrar Pagamento ─────────────────────────────────────────

export async function registrarPagamento(
  lancamentoId: string,
  data: {
    dataPagamento: Date;
    valorPago: number;
    observacao?: string;
  }
) {
  return prisma.lancamentoHonorario.update({
    where: { id: lancamentoId },
    data: {
      status: "pago",
      dataPagamento: data.dataPagamento,
      valorPago: data.valorPago,
      observacao: data.observacao,
    },
  });
}

// ─── Atualizar Atrasados ─────────────────────────────────────────

/**
 * Marca como "atrasado" todos os lançamentos pendentes com vencimento passado.
 */
export async function atualizarAtrasados(): Promise<number> {
  const hoje = startOfDay(new Date());

  const resultado = await prisma.lancamentoHonorario.updateMany({
    where: {
      status: "pendente",
      vencimento: { lt: hoje },
    },
    data: { status: "atrasado" },
  });

  return resultado.count;
}

// ─── Relatórios ──────────────────────────────────────────────────

export interface RelatorioFinanceiro {
  competencia: string;
  totalPrevisto: number;
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  inadimplencia: number; // percentual
}

export async function relatorioMensal(
  clienteIds: string[],
  competencia: string
): Promise<RelatorioFinanceiro> {
  const lancamentos = await prisma.lancamentoHonorario.findMany({
    where: {
      honorario: { clienteId: { in: clienteIds } },
      competencia,
    },
  });

  const totalPrevisto = lancamentos.reduce(
    (s, l) => s + Number(l.valor),
    0
  );
  const totalRecebido = lancamentos
    .filter((l) => l.status === "pago")
    .reduce((s, l) => s + Number(l.valorPago ?? l.valor), 0);
  const totalPendente = lancamentos
    .filter((l) => l.status === "pendente")
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalAtrasado = lancamentos
    .filter((l) => l.status === "atrasado")
    .reduce((s, l) => s + Number(l.valor), 0);

  const inadimplencia =
    totalPrevisto > 0
      ? Math.round(((totalAtrasado / totalPrevisto) * 100) * 100) / 100
      : 0;

  return {
    competencia,
    totalPrevisto,
    totalRecebido,
    totalPendente,
    totalAtrasado,
    inadimplencia,
  };
}

export interface AgingReport {
  faixa: string;
  quantidade: number;
  valorTotal: number;
}

export async function relatorioAging(
  clienteIds: string[]
): Promise<AgingReport[]> {
  const hoje = startOfDay(new Date());

  const atrasados = await prisma.lancamentoHonorario.findMany({
    where: {
      honorario: { clienteId: { in: clienteIds } },
      status: "atrasado",
    },
  });

  const faixas: Record<string, { quantidade: number; valorTotal: number }> = {
    "1-30 dias": { quantidade: 0, valorTotal: 0 },
    "31-60 dias": { quantidade: 0, valorTotal: 0 },
    "61-90 dias": { quantidade: 0, valorTotal: 0 },
    "90+ dias": { quantidade: 0, valorTotal: 0 },
  };

  for (const l of atrasados) {
    const dias = differenceInCalendarDays(hoje, l.vencimento);
    const valor = Number(l.valor);

    if (dias <= 30) {
      faixas["1-30 dias"].quantidade++;
      faixas["1-30 dias"].valorTotal += valor;
    } else if (dias <= 60) {
      faixas["31-60 dias"].quantidade++;
      faixas["31-60 dias"].valorTotal += valor;
    } else if (dias <= 90) {
      faixas["61-90 dias"].quantidade++;
      faixas["61-90 dias"].valorTotal += valor;
    } else {
      faixas["90+ dias"].quantidade++;
      faixas["90+ dias"].valorTotal += valor;
    }
  }

  return Object.entries(faixas).map(([faixa, dados]) => ({
    faixa,
    ...dados,
  }));
}
