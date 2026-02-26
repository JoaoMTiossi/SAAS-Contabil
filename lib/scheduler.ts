/**
 * Scheduler de Alertas
 * Sincroniza os alertas no banco de dados para um contrato.
 * - Ao criar/atualizar contrato: recria alertas futuros
 * - Ao concluir parcela/obrigação: cancela alertas pendentes relacionados
 */

import { prisma } from "@/lib/prisma";
import { gerarAlertasContrato, ContratoAlertas } from "@/lib/gerador-alertas";
import { startOfDay } from "date-fns";

/**
 * Recria todos os alertas futuros de um contrato.
 * Remove alertas "agendado" existentes e insere os novos calculados.
 */
export async function sincronizarAlertasContrato(
  contratoId: string
): Promise<void> {
  // Carrega dados do contrato com parcelas e obrigações pendentes
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: {
      parcelas: {
        where: { status: "pendente" },
        select: { id: true, numero: true, vencimento: true, descricao: true },
      },
      obrigacoes: {
        where: { status: "pendente" },
        select: { id: true, descricao: true, prazo: true },
      },
    },
  });

  if (!contrato) return;

  // Remove alertas agendados (não enviados) existentes
  await prisma.alerta.deleteMany({
    where: { contratoId, status: "agendado" },
  });

  // Gera novos alertas
  const input: ContratoAlertas = {
    contratoId,
    dataFim: contrato.dataFim,
    prazoAvisoCancelamento: contrato.prazoAvisoCancelamento,
    renovacaoAutomatica: contrato.renovacaoAutomatica,
    parcelas: contrato.parcelas.map((p) => ({
      id: p.id,
      numero: p.numero,
      vencimento: p.vencimento,
      descricao: p.descricao,
    })),
    obrigacoes: contrato.obrigacoes.map((o) => ({
      id: o.id,
      descricao: o.descricao,
      prazo: o.prazo,
    })),
  };

  const alertasGerados = gerarAlertasContrato(input);

  if (alertasGerados.length === 0) return;

  await prisma.alerta.createMany({
    data: alertasGerados.map((a) => ({
      contratoId,
      parcelaId: a.parcelaId ?? null,
      obrigacaoId: a.obrigacaoId ?? null,
      refTipo: a.refTipo,
      refDescricao: a.refDescricao,
      dataAlerta: a.dataAlerta,
      antecedenciaDias: a.antecedenciaDias,
      prioridade: a.prioridade,
      canais: a.canais,
      status: "agendado",
    })),
  });
}

/**
 * Cancela todos os alertas futuros de uma parcela específica.
 * Chamado quando a parcela é marcada como pago/cancelado.
 */
export async function cancelarAlertasParcela(parcelaId: string): Promise<void> {
  const hoje = startOfDay(new Date());
  await prisma.alerta.updateMany({
    where: {
      parcelaId,
      status: "agendado",
      dataAlerta: { gte: hoje },
    },
    data: { status: "cancelado" },
  });
}

/**
 * Cancela todos os alertas futuros de uma obrigação específica.
 * Chamado quando a obrigação é marcada como entregue/cancelado.
 */
export async function cancelarAlertasObrigacao(
  obrigacaoId: string
): Promise<void> {
  const hoje = startOfDay(new Date());
  await prisma.alerta.updateMany({
    where: {
      obrigacaoId,
      status: "agendado",
      dataAlerta: { gte: hoje },
    },
    data: { status: "cancelado" },
  });
}

/**
 * Cancela todos os alertas futuros do contrato (vencimento + renovação).
 * Chamado quando o contrato é encerrado/cancelado.
 */
export async function cancelarAlertasContrato(
  contratoId: string
): Promise<void> {
  const hoje = startOfDay(new Date());
  await prisma.alerta.updateMany({
    where: {
      contratoId,
      status: "agendado",
      dataAlerta: { gte: hoje },
    },
    data: { status: "cancelado" },
  });
}

/**
 * Marca como "enviado" todos os alertas agendados para hoje ou antes.
 * Deve ser executado diariamente via cron.
 */
export async function processarAlertasVencidos(): Promise<number> {
  const hoje = startOfDay(new Date());
  const resultado = await prisma.alerta.updateMany({
    where: {
      status: "agendado",
      dataAlerta: { lte: hoje },
    },
    data: { status: "enviado" },
  });
  return resultado.count;
}
