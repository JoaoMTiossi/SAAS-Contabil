/**
 * GET /api/dashboard?escritorioId=xxx
 * Dashboard consolidado com visão geral de todos os módulos.
 */

import { NextRequest, NextResponse } from "next/server";
import { montarDashboard } from "@/lib/agents/agente-menu";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const escritorioId = req.nextUrl.searchParams.get("escritorioId");

  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const dashboard = await montarDashboard(escritorioId);
    return NextResponse.json(dashboard);
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({ erro: "Erro ao montar dashboard." }, { status: 500 });
  }
}
