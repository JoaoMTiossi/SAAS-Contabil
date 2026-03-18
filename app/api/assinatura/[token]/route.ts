/**
 * GET /api/assinatura/[token] — página pública de visualização do contrato
 */

import { NextRequest, NextResponse } from "next/server";
import { visualizarAssinatura } from "@/lib/agents/agente-assinatura";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const dados = await visualizarAssinatura(token);
    return NextResponse.json(dados);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ erro: message }, { status: 400 });
  }
}
