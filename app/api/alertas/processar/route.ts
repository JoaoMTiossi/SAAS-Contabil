/**
 * POST /api/alertas/processar
 * Marca como "enviado" todos os alertas agendados com data <= hoje.
 * Deve ser chamado diariamente via cron (ex: Vercel Cron Jobs).
 *
 * Protegido por API_SECRET_KEY para evitar chamadas não autorizadas.
 */

import { NextRequest, NextResponse } from "next/server";
import { processarAlertasVencidos } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  const secretKey = req.headers.get("x-api-key");

  if (!process.env.API_SECRET_KEY) {
    return NextResponse.json({ erro: "API_SECRET_KEY não configurada." }, { status: 500 });
  }

  if (secretKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const quantidade = await processarAlertasVencidos();

  return NextResponse.json({
    mensagem: `${quantidade} alerta(s) processado(s).`,
    quantidade,
  });
}
