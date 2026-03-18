/**
 * PATCH /api/kanban/checklists/[id] — toggle checklist item
 */

import { NextRequest, NextResponse } from "next/server";
import { atualizarChecklist } from "@/lib/agents/agente-rescisao";
import { z } from "zod";

const ToggleSchema = z.object({
  feito: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = ToggleSchema.parse(body);
    const updated = await atualizarChecklist(id, data.feito);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/kanban/checklists]", err);
    return NextResponse.json({ erro: "Erro ao atualizar checklist." }, { status: 500 });
  }
}
