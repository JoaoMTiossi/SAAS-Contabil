/**
 * POST /api/honorarios/gerar-lancamentos — gerar lançamentos do mês
 */

import { NextRequest, NextResponse } from "next/server";
import { gerarLancamentosMes } from "@/lib/agents/agente-cobranca";
import { prisma } from "@/lib/prisma";
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

    const clientes = await prisma.cliente.findMany({
      where: { escritorioId: data.escritorioId },
      select: { id: true },
    });

    const criados = await gerarLancamentosMes(
      clientes.map((c) => c.id),
      data.competencia
    );

    return NextResponse.json({ lancamentosCriados: criados });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/honorarios/gerar-lancamentos]", err);
    return NextResponse.json({ erro: "Erro ao gerar lançamentos." }, { status: 500 });
  }
}
