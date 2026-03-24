/**
 * GET /api/alertas
 * Lista alertas com filtros: contratoId, status, prioridade, dataInicio, dataFim
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get("contratoId");
    const status = searchParams.get("status");
    const prioridade = searchParams.get("prioridade");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") ?? "1") || 1);
    const porPagina = Math.min(100, Math.max(1, parseInt(searchParams.get("porPagina") ?? "50") || 50));

    const where: Record<string, unknown> = {};
    if (contratoId) where.contratoId = contratoId;
    if (status) where.status = status;
    if (prioridade) where.prioridade = prioridade;
    if (dataInicio || dataFim) {
      const dataAlerta: Record<string, Date> = {};
      if (dataInicio) {
        const dInicio = new Date(dataInicio);
        if (!isNaN(dInicio.getTime())) dataAlerta.gte = dInicio;
      }
      if (dataFim) {
        const dFim = new Date(dataFim);
        if (!isNaN(dFim.getTime())) dataAlerta.lte = dFim;
      }
      if (Object.keys(dataAlerta).length > 0) where.dataAlerta = dataAlerta;
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
  } catch (err) {
    console.error("[GET /api/alertas]", err);
    return NextResponse.json({ erro: "Erro ao listar alertas." }, { status: 500 });
  }
}
