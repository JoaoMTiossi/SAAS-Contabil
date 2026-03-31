/**
 * PATCH  /api/kanban/checklists/[id] — toggle ou editar checklist item
 * DELETE /api/kanban/checklists/[id] — excluir checklist item
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

const UpdateChecklistSchema = z.object({
  feito: z.boolean().optional(),
  descricao: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const data = UpdateChecklistSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.feito !== undefined) updateData.feito = data.feito;
    if (data.descricao !== undefined) updateData.descricao = data.descricao;

    const updated = await prisma.kanbanChecklist.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/kanban/checklists]", err);
    return NextResponse.json({ erro: "Erro ao atualizar checklist." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.kanbanChecklist.delete({ where: { id } });
    return NextResponse.json({ mensagem: "Item excluído." });
  } catch (err) {
    console.error("[DELETE /api/kanban/checklists]", err);
    return NextResponse.json({ erro: "Erro ao excluir item." }, { status: 500 });
  }
}
