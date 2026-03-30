/**
 * GET /api/contratos/[id]/certificado — gera certificado de assinatura
 */

import { NextRequest, NextResponse } from "next/server";
import { gerarCertificado } from "@/lib/agents/agente-assinatura";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const certificado = await gerarCertificado(id);
    return NextResponse.json({ certificado });
  } catch (err) {
    console.error("[GET /api/contratos/[id]/certificado]", err);
    return NextResponse.json(
      { erro: "Erro ao gerar certificado." },
      { status: 500 }
    );
  }
}
