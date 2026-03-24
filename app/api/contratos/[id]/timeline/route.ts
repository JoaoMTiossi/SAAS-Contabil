/**
 * GET /api/contratos/[id]/timeline — timeline de eventos do contrato
 */

import { NextRequest, NextResponse } from "next/server";
import { obterTimeline } from "@/lib/agents/agente-gestao-contratos";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const eventos = await obterTimeline(id);
    return NextResponse.json({ eventos });
  } catch (err) {
    console.error("[GET /api/contratos/[id]/timeline]", err);
    return NextResponse.json({ erro: "Erro ao obter timeline." }, { status: 500 });
  }
}
