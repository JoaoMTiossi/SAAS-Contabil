/**
 * POST /api/calendario-fiscal/gerar — gerar calendário do mês para todos os clientes
 */

import { NextRequest, NextResponse } from "next/server";
import { gerarCalendarioMes } from "@/lib/agents/agente-calendario-fiscal";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

const Schema = z.object({
  escritorioId: z.string(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = Schema.parse(body);
    const criadas = await gerarCalendarioMes(data.escritorioId, data.competencia);
    return NextResponse.json({ obrigacoesCriadas: criadas });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/calendario-fiscal/gerar]", err);
    return NextResponse.json({ erro: "Erro ao gerar calendário." }, { status: 500 });
  }
}
