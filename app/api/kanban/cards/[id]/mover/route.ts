/**
 * PATCH /api/kanban/cards/[id]/mover — mover card entre colunas
 */

import { NextRequest, NextResponse } from "next/server";
import { moverCard } from "@/lib/agents/agente-rescisao";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

const MoverSchema = z.object({
  colunaId: z.string(),
  ordem: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = MoverSchema.parse(body);
    await moverCard(id, data.colunaId, data.ordem);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ erro: message }, { status: 400 });
  }
}
