/**
 * POST /api/kanban/cards — criar card de rescisão
 */

import { NextRequest, NextResponse } from "next/server";
import { criarCardRescisao } from "@/lib/agents/agente-rescisao";
import { z } from "zod";

const CriarCardSchema = z.object({
  escritorioId: z.string(),
  contratoId: z.string(),
  clienteId: z.string(),
  motivo: z.string().optional(),
  dataPrevisao: z.string().transform((s) => new Date(s)).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CriarCardSchema.parse(body);
    const card = await criarCardRescisao(data);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/kanban/cards]", err);
    return NextResponse.json({ erro: "Erro ao criar card." }, { status: 500 });
  }
}
