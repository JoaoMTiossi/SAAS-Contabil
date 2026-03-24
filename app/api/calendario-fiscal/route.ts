/**
 * GET /api/calendario-fiscal?escritorioId=xxx&competencia=2026-03
 */

import { NextRequest, NextResponse } from "next/server";
import { obterCalendarioMes } from "@/lib/agents/agente-calendario-fiscal";
import { format } from "date-fns";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  const competencia = req.nextUrl.searchParams.get("competencia") ?? format(new Date(), "yyyy-MM");

  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const calendario = await obterCalendarioMes(escritorioId, competencia);
    return NextResponse.json({ competencia, itens: calendario });
  } catch (err) {
    console.error("[GET /api/calendario-fiscal]", err);
    return NextResponse.json({ erro: "Erro ao obter calendário fiscal." }, { status: 500 });
  }
}
