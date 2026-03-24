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
    return NextResponse.json({ produtividade });
  } catch (err) {
    console.error("[GET /api/timesheet/produtividade]", err);
    return NextResponse.json({ erro: "Erro ao calcular produtividade." }, { status: 500 });
  }
}
