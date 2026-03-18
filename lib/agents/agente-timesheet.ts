/**
 * Agente Timesheet
 * Registro de horas, categorias, produtividade e rentabilidade.
 */

import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

// ─── Registro de Horas ───────────────────────────────────────────

export async function registrarHoras(data: {
  usuarioId: string;
  clienteId: string;
  categoria: "fiscal" | "contabil" | "dp" | "consultoria" | "administrativo";
  descricao?: string;
  data: Date;
  horaInicio?: Date;
  horaFim?: Date;
  duracao: number; // minutos
}) {
  return prisma.timesheet.create({
    data: {
      usuarioId: data.usuarioId,
      clienteId: data.clienteId,
      categoria: data.categoria,
      descricao: data.descricao,
      data: data.data,
      horaInicio: data.horaInicio,
      horaFim: data.horaFim,
      duracao: data.duracao,
    },
  });
}

export async function listarLancamentos(
  usuarioId: string,
  periodo: "semana" | "mes",
  dataReferencia?: Date
) {
  const ref = dataReferencia ?? new Date();
  const inicio = periodo === "semana" ? startOfWeek(ref, { weekStartsOn: 1 }) : startOfMonth(ref);
  const fim = periodo === "semana" ? endOfWeek(ref, { weekStartsOn: 1 }) : endOfMonth(ref);

  return prisma.timesheet.findMany({
    where: {
      usuarioId,
      data: { gte: inicio, lte: fim },
    },
    include: {
      cliente: { select: { razaoSocial: true } },
    },
    orderBy: [{ data: "desc" }, { horaInicio: "desc" }],
  });
}

// ─── Metas de Produtividade ──────────────────────────────────────

export async function definirMeta(
  usuarioId: string,
  mes: string,
  metaHoras: number
) {
  return prisma.metaProdutividade.upsert({
    where: { usuarioId_mes: { usuarioId, mes } },
    create: { usuarioId, mes, metaHoras },
    update: { metaHoras },
  });
}

// ─── Dashboard de Produtividade ──────────────────────────────────

export interface ProdutividadeColaborador {
  usuarioId: string;
  nome: string;
  mes: string;
  metaHoras: number;
  horasRealizadas: number;
  percentualMeta: number;
  horasPorCategoria: Record<string, number>;
}

export async function dashboardProdutividade(
  escritorioId: string,
  mes?: string
): Promise<ProdutividadeColaborador[]> {
  const competencia = mes ?? format(new Date(), "yyyy-MM");
  const [ano, mesNum] = competencia.split("-").map(Number);
  const inicio = new Date(ano, mesNum - 1, 1);
  const fim = endOfMonth(inicio);

  const usuarios = await prisma.usuario.findMany({
    where: { escritorioId },
    include: {
      metas: { where: { mes: competencia } },
      timesheets: {
        where: { data: { gte: inicio, lte: fim } },
      },
    },
  });

  return usuarios.map((u) => {
    const metaHoras = u.metas[0]?.metaHoras ?? 160;
    const minutosTotais = u.timesheets.reduce((s, t) => s + t.duracao, 0);
    const horasRealizadas = Math.round((minutosTotais / 60) * 100) / 100;

    // Horas por categoria
    const horasPorCategoria: Record<string, number> = {};
    for (const t of u.timesheets) {
      const cat = t.categoria;
      horasPorCategoria[cat] = (horasPorCategoria[cat] ?? 0) + t.duracao / 60;
    }

    // Arredondar
    for (const cat of Object.keys(horasPorCategoria)) {
      horasPorCategoria[cat] = Math.round(horasPorCategoria[cat] * 100) / 100;
    }

    return {
      usuarioId: u.id,
      nome: u.nome,
      mes: competencia,
      metaHoras,
      horasRealizadas,
      percentualMeta: metaHoras > 0 ? Math.round((horasRealizadas / metaHoras) * 100) : 0,
      horasPorCategoria,
    };
  });
}

// ─── Relatório de Rentabilidade ──────────────────────────────────

export interface RentabilidadeCliente {
  clienteId: string;
  razaoSocial: string;
  horasGastas: number;
  honorarioMensal: number;
  custoPorHora: number;
  rentavel: boolean;
}

export async function relatorioRentabilidade(
  escritorioId: string,
  mes?: string
): Promise<RentabilidadeCliente[]> {
  const competencia = mes ?? format(new Date(), "yyyy-MM");
  const [ano, mesNum] = competencia.split("-").map(Number);
  const inicio = new Date(ano, mesNum - 1, 1);
  const fim = endOfMonth(inicio);

  const clientes = await prisma.cliente.findMany({
    where: { escritorioId },
    include: {
      timesheets: {
        where: { data: { gte: inicio, lte: fim } },
      },
      honorarios: {
        where: { ativo: true },
      },
    },
  });

  // Custo/hora estimado do escritório (pode ser configurável futuramente)
  const custoHoraBase = 50; // R$/hora

  return clientes.map((c) => {
    const minutosTotais = c.timesheets.reduce((s, t) => s + t.duracao, 0);
    const horasGastas = Math.round((minutosTotais / 60) * 100) / 100;
    const honorarioMensal = c.honorarios.reduce(
      (s, h) => s + Number(h.valor),
      0
    );
    const custoTotal = horasGastas * custoHoraBase;

    return {
      clienteId: c.id,
      razaoSocial: c.razaoSocial,
      horasGastas,
      honorarioMensal,
      custoPorHora: horasGastas > 0 ? Math.round((honorarioMensal / horasGastas) * 100) / 100 : 0,
      rentavel: honorarioMensal >= custoTotal,
    };
  });
}
