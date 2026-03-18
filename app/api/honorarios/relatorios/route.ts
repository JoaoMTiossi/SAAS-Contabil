/**
 * GET /api/honorarios/relatorios?escritorioId=xxx&competencia=2026-03&tipo=mensal|aging
 */

import { NextRequest, NextResponse } from "next/server";
import { relatorioMensal, relatorioAging } from "@/lib/agents/agente-cobranca";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  const tipo = req.nextUrl.searchParams.get("tipo") ?? "mensal";
  const competencia = req.nextUrl.searchParams.get("competencia") ?? format(new Date(), "yyyy-MM");

  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where: { escritorioId },
      select: { id: true },
    });
    const clienteIds = clientes.map((c) => c.id);

    if (tipo === "aging") {
      const aging = await relatorioAging(clienteIds);
      return NextResponse.json({ tipo: "aging", dados: aging });
    }

    const mensal = await relatorioMensal(clienteIds, competencia);
    return NextResponse.json({ tipo: "mensal", dados: mensal });
  } catch (err) {
    console.error("[GET /api/honorarios/relatorios]", err);
    return NextResponse.json({ erro: "Erro ao gerar relatório." }, { status: 500 });
  }
}
