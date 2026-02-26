/**
 * GET /api/alertas
 * Lista alertas com filtros: contratoId, status, prioridade, dataInicio, dataFim
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId");
  const status = searchParams.get("status");
  const prioridade = searchParams.get("prioridade");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");
  const pagina = parseInt(searchParams.get("pagina") ?? "1");
  const porPagina = parseInt(searchParams.get("porPagina") ?? "50");

  const where: Record<string, unknown> = {};
  if (contratoId) where.contratoId = contratoId;
  if (status) where.status = status;
  if (prioridade) where.prioridade = prioridade;
  if (dataInicio || dataFim) {
    const dataAlerta: Record<string, Date> = {};
    if (dataInicio) dataAlerta.gte = new Date(dataInicio);
    if (dataFim) dataAlerta.lte = new Date(dataFim);
    where.dataAlerta = dataAlerta;
  }

  const [total, alertas] = await Promise.all([
    prisma.alerta.count({ where }),
    prisma.alerta.findMany({
      where,
      orderBy: { dataAlerta: "asc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        contrato: { select: { identificador: true, contratante: true, contratado: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, pagina, porPagina, alertas });
}
