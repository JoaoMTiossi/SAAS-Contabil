/**
 * GET /api/kanban?escritorioId=xxx — board completo com colunas e cards
 */

import { NextRequest, NextResponse } from "next/server";
import { obterOuCriarBoard } from "@/lib/agents/agente-rescisao";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const board = await obterOuCriarBoard(escritorioId);
    return NextResponse.json(board);
  } catch (err) {
    console.error("[GET /api/kanban]", err);
    return NextResponse.json({ erro: "Erro ao obter kanban." }, { status: 500 });
  }
}
