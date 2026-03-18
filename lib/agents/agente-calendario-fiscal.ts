/**
 * Agente Calendário Fiscal
 * Gerencia obrigações acessórias e impostos por cliente/regime tributário.
 * Alertas automáticos para escritório e clientes.
 */

import { prisma } from "@/lib/prisma";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { enviarNotificacao } from "@/lib/notificacoes/engine";

// ─── Seed: Obrigações Fiscais Base ───────────────────────────────

/**
 * Obrigações fiscais padrão do Brasil.
 * Executar uma vez para popular a tabela base.
 */
export const OBRIGACOES_FISCAIS_PADRAO = [
  // Simples Nacional
  { nome: "DAS", sigla: "DAS", tipo: "imposto" as const, regimes: ["simples_nacional" as const], dia: 20, periodicidade: "mensal" as const, descricao: "Documento de Arrecadação do Simples Nacional" },
  { nome: "DEFIS", sigla: "DEFIS", tipo: "acessoria" as const, regimes: ["simples_nacional" as const], dia: 31, mes: 3, periodicidade: "anual" as const, descricao: "Declaração de Informações Socioeconômicas e Fiscais" },
  { nome: "PGDAS-D", sigla: "PGDAS-D", tipo: "acessoria" as const, regimes: ["simples_nacional" as const], dia: 20, periodicidade: "mensal" as const, descricao: "Programa Gerador do DAS Declaratório" },

  // Lucro Presumido
  { nome: "IRPJ Presumido", sigla: "IRPJ", tipo: "imposto" as const, regimes: ["lucro_presumido" as const], dia: 31, periodicidade: "trimestral" as const, descricao: "Imposto de Renda Pessoa Jurídica - Lucro Presumido" },
  { nome: "CSLL Presumido", sigla: "CSLL", tipo: "imposto" as const, regimes: ["lucro_presumido" as const], dia: 31, periodicidade: "trimestral" as const, descricao: "Contribuição Social sobre Lucro Líquido" },
  { nome: "PIS", sigla: "PIS", tipo: "imposto" as const, regimes: ["lucro_presumido" as const, "lucro_real" as const], dia: 25, periodicidade: "mensal" as const, descricao: "Programa de Integração Social" },
  { nome: "COFINS", sigla: "COFINS", tipo: "imposto" as const, regimes: ["lucro_presumido" as const, "lucro_real" as const], dia: 25, periodicidade: "mensal" as const, descricao: "Contribuição para Financiamento da Seguridade Social" },

  // Lucro Real
  { nome: "IRPJ Real", sigla: "IRPJ", tipo: "imposto" as const, regimes: ["lucro_real" as const], dia: 31, periodicidade: "trimestral" as const, descricao: "Imposto de Renda PJ - Lucro Real" },
  { nome: "CSLL Real", sigla: "CSLL", tipo: "imposto" as const, regimes: ["lucro_real" as const], dia: 31, periodicidade: "trimestral" as const, descricao: "CSLL - Lucro Real" },

  // Obrigações acessórias (Presumido e Real)
  { nome: "SPED Fiscal", sigla: "EFD-ICMS/IPI", tipo: "acessoria" as const, regimes: ["lucro_presumido" as const, "lucro_real" as const], dia: 20, periodicidade: "mensal" as const, descricao: "Escrituração Fiscal Digital ICMS/IPI" },
  { nome: "SPED Contribuições", sigla: "EFD-Contrib", tipo: "acessoria" as const, regimes: ["lucro_presumido" as const, "lucro_real" as const], dia: 15, periodicidade: "mensal" as const, descricao: "Escrituração Fiscal Digital das Contribuições" },
  { nome: "DCTF", sigla: "DCTF", tipo: "acessoria" as const, regimes: ["lucro_presumido" as const, "lucro_real" as const], dia: 15, periodicidade: "mensal" as const, descricao: "Declaração de Débitos e Créditos Tributários Federais" },
  { nome: "ECD", sigla: "ECD", tipo: "acessoria" as const, regimes: ["lucro_presumido" as const, "lucro_real" as const], dia: 31, mes: 5, periodicidade: "anual" as const, descricao: "Escrituração Contábil Digital" },
  { nome: "ECF", sigla: "ECF", tipo: "acessoria" as const, regimes: ["lucro_presumido" as const, "lucro_real" as const], dia: 31, mes: 7, periodicidade: "anual" as const, descricao: "Escrituração Contábil Fiscal" },

  // Todos os regimes
  { nome: "eSocial", sigla: "eSocial", tipo: "acessoria" as const, regimes: ["simples_nacional" as const, "lucro_presumido" as const, "lucro_real" as const, "mei" as const], dia: 15, periodicidade: "mensal" as const, descricao: "Sistema de Escrituração Digital das Obrigações Fiscais, Previdenciárias e Trabalhistas" },
  { nome: "DCTFWeb", sigla: "DCTFWeb", tipo: "acessoria" as const, regimes: ["simples_nacional" as const, "lucro_presumido" as const, "lucro_real" as const], dia: 15, periodicidade: "mensal" as const, descricao: "Declaração de Débitos e Créditos Tributários Federais Web" },
  { nome: "DIRF", sigla: "DIRF", tipo: "acessoria" as const, regimes: ["simples_nacional" as const, "lucro_presumido" as const, "lucro_real" as const], dia: 28, mes: 2, periodicidade: "anual" as const, descricao: "Declaração do Imposto sobre a Renda Retido na Fonte" },
];

/**
 * Popula a tabela de obrigações fiscais base (idempotente).
 */
export async function seedObrigacoesFiscais(): Promise<number> {
  let criadas = 0;

  for (const obr of OBRIGACOES_FISCAIS_PADRAO) {
    const existente = await prisma.obrigacaoFiscal.findFirst({
      where: { nome: obr.nome },
    });

    if (!existente) {
      await prisma.obrigacaoFiscal.create({
        data: {
          nome: obr.nome,
          sigla: obr.sigla,
          tipo: obr.tipo,
          regimes: obr.regimes,
          diaVencimento: obr.dia,
          mesVencimento: obr.mes ?? null,
          periodicidade: obr.periodicidade,
          descricao: obr.descricao,
        },
      });
      criadas++;
    }
  }

  return criadas;
}

// ─── Geração de Calendário ───────────────────────────────────────

/**
 * Gera o calendário fiscal do mês para todos os clientes de um escritório.
 * Cria entradas apenas para obrigações que se aplicam ao regime do cliente.
 */
export async function gerarCalendarioMes(
  escritorioId: string,
  competencia?: string
): Promise<number> {
  const comp = competencia ?? format(new Date(), "yyyy-MM");
  const [ano, mes] = comp.split("-").map(Number);

  const clientes = await prisma.cliente.findMany({
    where: { escritorioId, regimeTributario: { not: null } },
  });

  const obrigacoes = await prisma.obrigacaoFiscal.findMany({
    where: { ativo: true },
  });

  let criadas = 0;

  for (const cliente of clientes) {
    if (!cliente.regimeTributario) continue;

    // Filtrar obrigações que se aplicam ao regime do cliente
    const obrigacoesCliente = obrigacoes.filter((o) =>
      o.regimes.includes(cliente.regimeTributario!)
    );

    for (const obr of obrigacoesCliente) {
      // Verificar periodicidade
      if (obr.periodicidade === "anual" && obr.mesVencimento !== mes) continue;
      if (obr.periodicidade === "trimestral" && ![3, 6, 9, 12].includes(mes)) continue;

      // Verificar duplicata
      const existente = await prisma.calendarioFiscalCliente.findFirst({
        where: { clienteId: cliente.id, obrigacaoId: obr.id, competencia: comp },
      });
      if (existente) continue;

      const dia = Math.min(obr.diaVencimento ?? 20, 28);
      const vencimento = new Date(ano, mes - 1, dia);

      await prisma.calendarioFiscalCliente.create({
        data: {
          clienteId: cliente.id,
          obrigacaoId: obr.id,
          competencia: comp,
          vencimento,
        },
      });
      criadas++;
    }
  }

  return criadas;
}

// ─── Consultas ───────────────────────────────────────────────────

export async function obterCalendarioMes(
  escritorioId: string,
  competencia?: string
) {
  const comp = competencia ?? format(new Date(), "yyyy-MM");

  return prisma.calendarioFiscalCliente.findMany({
    where: {
      cliente: { escritorioId },
      competencia: comp,
    },
    include: {
      cliente: { select: { razaoSocial: true, cnpj: true } },
      obrigacao: { select: { nome: true, sigla: true, tipo: true } },
      responsavel: { select: { nome: true } },
    },
    orderBy: [{ vencimento: "asc" }, { cliente: { razaoSocial: "asc" } }],
  });
}

export async function obterCalendarioCliente(
  clienteId: string,
  competencia?: string
) {
  const comp = competencia ?? format(new Date(), "yyyy-MM");

  return prisma.calendarioFiscalCliente.findMany({
    where: { clienteId, competencia: comp },
    include: {
      obrigacao: true,
      responsavel: { select: { nome: true } },
    },
    orderBy: { vencimento: "asc" },
  });
}

export async function atualizarStatusObrigacao(
  id: string,
  status: "pendente" | "em_andamento" | "entregue" | "atrasada",
  responsavelId?: string
) {
  return prisma.calendarioFiscalCliente.update({
    where: { id },
    data: { status, responsavelId },
  });
}

// ─── Alertas Fiscais ─────────────────────────────────────────────

/**
 * Verifica obrigações vencendo em breve e envia alertas.
 */
export async function verificarAlertasFiscais(
  escritorioId: string
): Promise<number> {
  const hoje = new Date();
  const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

  const proximas = await prisma.calendarioFiscalCliente.findMany({
    where: {
      cliente: { escritorioId },
      status: { in: ["pendente", "em_andamento"] },
      vencimento: { gte: hoje, lte: em7dias },
    },
    include: {
      cliente: { select: { razaoSocial: true, email: true } },
      obrigacao: { select: { nome: true, sigla: true } },
    },
  });

  for (const item of proximas) {
    const dias = Math.ceil(
      (item.vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Notificar escritório
    await enviarNotificacao({
      escritorioId,
      titulo: `${item.obrigacao.sigla ?? item.obrigacao.nome} vencendo em ${dias} dia(s)`,
      mensagem: `Obrigação ${item.obrigacao.nome} do cliente ${item.cliente.razaoSocial} vence em ${format(item.vencimento, "dd/MM/yyyy")}.`,
      canais: ["dashboard", "email"],
      link: `/calendario-fiscal/${item.clienteId}`,
      destinatarioEmail: item.cliente.email ?? undefined,
    });
  }

  return proximas.length;
}
