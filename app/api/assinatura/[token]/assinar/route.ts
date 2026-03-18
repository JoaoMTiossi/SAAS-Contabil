/**
 * POST /api/assinatura/[token]/assinar — registrar assinatura eletrônica
 */

import { NextRequest, NextResponse } from "next/server";
import { assinarContrato } from "@/lib/agents/agente-assinatura";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const assinatura = await assinarContrato({ token, ip, userAgent });
    return NextResponse.json(assinatura);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ erro: message }, { status: 400 });
  }
}
