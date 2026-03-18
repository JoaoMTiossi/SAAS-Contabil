/**
 * Agente Menu (Orquestrador)
 * Dashboard consolidado com visão geral de todos os módulos.
 * Compila métricas de cada agente para exibir no painel principal.
 */

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfMonth, startOfMonth, addDays } from "date-fns";

export interface ResumoModulo {
  modulo: string;
  icone: string;
  destaque: string;
  valor: number;
  link: string;
}

export interface DashboardGeral {
  escritorioId: string;
  resumos: ResumoModulo[];
  alertasUrgentes: number;
  notificacoesNaoLidas: number;
}

/**
 * Monta o dashboard consolidado de um escritório.
 */
export async function montarDashboard(
  escritorioId: string
): Promise<DashboardGeral> {
  const hoje = startOfDay(new Date());
  const fimMes = endOfMonth(hoje);
  const inicioMes = startOfMonth(hoje);
  const em7dias = addDays(hoje, 7);

  // Buscar IDs dos clientes do escritório
  const clientes = await prisma.cliente.findMany({
    where: { escritorioId },
    select: { id: true },
  });
  const clienteIds = clientes.map((c) => c.id);

  // Executar consultas em paralelo
  const [
    contratosAtivos,
    contratosVencendo,
    lancamentosPendentes,
    obrigacoesFiscaisPendentes,
    rescisoesPendentes,
    timesheetHorasMes,
    alertasUrgentes,
    notificacoesNaoLidas,
  ] = await Promise.all([
    // Contratos ativos
    prisma.contrato.count({
      where: { clienteId: { in: clienteIds }, status: "ativo" },
    }),

    // Contratos vencendo em 7 dias
    prisma.contrato.count({
      where: {
        clienteId: { in: clienteIds },
        status: "ativo",
        dataFim: { gte: hoje, lte: em7dias },
      },
    }),

    // Honorários pendentes
    prisma.lancamentoHonorario.count({
      where: {
        honorario: { clienteId: { in: clienteIds } },
        status: { in: ["pendente", "atrasado"] },
      },
    }),

    // Obrigações fiscais pendentes do mês
    prisma.calendarioFiscalCliente.count({
      where: {
        clienteId: { in: clienteIds },
        vencimento: { gte: inicioMes, lte: fimMes },
        status: { in: ["pendente", "em_andamento"] },
      },
    }),

    // Rescisões em andamento (cards no kanban)
    prisma.kanbanCard.count({
      where: { clienteId: { in: clienteIds } },
    }),

    // Horas registradas no mês
    prisma.timesheet.aggregate({
      where: {
        usuario: { escritorioId },
        data: { gte: inicioMes, lte: fimMes },
      },
      _sum: { duracao: true },
    }),

    // Alertas urgentes/críticos não enviados
    prisma.alerta.count({
      where: {
        contrato: { clienteId: { in: clienteIds } },
        prioridade: { in: ["urgente", "critico"] },
        status: "agendado",
        dataAlerta: { lte: addDays(hoje, 3) },
      },
    }),

    // Notificações não lidas
    prisma.notificacao.count({
      where: { escritorioId, lida: false },
    }),
  ]);

  const horasMes = Math.round((timesheetHorasMes._sum.duracao ?? 0) / 60);

  const resumos: ResumoModulo[] = [
    {
      modulo: "Contratos Ativos",
      icone: "FileText",
      destaque: `${contratosVencendo} vencendo em 7 dias`,
      valor: contratosAtivos,
      link: "/contratos",
    },
    {
      modulo: "Honorários Pendentes",
      icone: "DollarSign",
      destaque: `${lancamentosPendentes} cobranças em aberto`,
      valor: lancamentosPendentes,
      link: "/honorarios",
    },
    {
      modulo: "Obrigações Fiscais",
      icone: "Calendar",
      destaque: `${obrigacoesFiscaisPendentes} pendentes este mês`,
      valor: obrigacoesFiscaisPendentes,
      link: "/calendario-fiscal",
    },
    {
      modulo: "Rescisões",
      icone: "Kanban",
      destaque: `${rescisoesPendentes} em andamento`,
      valor: rescisoesPendentes,
      link: "/rescisoes",
    },
    {
      modulo: "Timesheet",
      icone: "Clock",
      destaque: `${horasMes}h registradas este mês`,
      valor: horasMes,
      link: "/timesheet",
    },
  ];

  return {
    escritorioId,
    resumos,
    alertasUrgentes,
    notificacoesNaoLidas,
  };
}
