/**
 * GET /api/timesheet/produtividade?escritorioId=xxx&mes=2026-03
 */

import { NextRequest, NextResponse } from "next/server";
import { dashboardProdutividade } from "@/lib/agents/agente-timesheet";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  const mes = req.nextUrl.searchParams.get("mes") ?? undefined;

  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const produtividade = await dashboardProdutividade(escritorioId, mes);
    // Transform to match frontend interface
    const data = produtividade.map((p) => ({
      usuarioId: p.usuarioId,
      nome: p.nome,
      horasRealizadas: p.horasRealizadas,
      meta: p.metaHoras,
      categorias: Object.entries(p.horasPorCategoria).map(([categoria, horas]) => ({
        categoria,
        minutos: Math.round(horas * 60),
      })),
    }));
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/timesheet/produtividade]", err);
    return NextResponse.json({ erro: "Erro ao calcular produtividade." }, { status: 500 });
  }
}
