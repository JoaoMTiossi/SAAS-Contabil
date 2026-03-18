/**
 * GET   /api/notificacoes?escritorioId=xxx&naoLidas=true
 * PATCH /api/notificacoes — marcar como lida
 */

import { NextRequest, NextResponse } from "next/server";
import { listarNotificacoes, marcarComoLida, contarNaoLidas } from "@/lib/notificacoes/dashboard";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  const naoLidas = req.nextUrl.searchParams.get("naoLidas") === "true";

  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const [notificacoes, totalNaoLidas] = await Promise.all([
      listarNotificacoes(escritorioId, naoLidas),
      contarNaoLidas(escritorioId),
    ]);
    return NextResponse.json({ notificacoes, totalNaoLidas });
  } catch (err) {
    console.error("[GET /api/notificacoes]", err);
    return NextResponse.json({ erro: "Erro ao listar notificações." }, { status: 500 });
  }
}

const MarcarLidaSchema = z.object({
  notificacaoId: z.string(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = MarcarLidaSchema.parse(body);
    await marcarComoLida(data.notificacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/notificacoes]", err);
    return NextResponse.json({ erro: "Erro ao marcar como lida." }, { status: 500 });
  }
}
