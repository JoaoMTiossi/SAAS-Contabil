/**
 * PATCH  /api/kanban/colunas/[id] — renomear ou alterar cor da coluna
 * DELETE /api/kanban/colunas/[id] — excluir coluna (se não tiver cards)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

const UpdateColunaSchema = z.object({
  nome: z.string().min(1).optional(),
  cor: z.string().nullable().optional(),
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
    const data = UpdateColunaSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.cor !== undefined) updateData.cor = data.cor;

    const coluna = await prisma.kanbanColuna.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(coluna);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/kanban/colunas/[id]]", err);
    return NextResponse.json({ erro: "Erro ao atualizar coluna." }, { status: 500 });
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
    const cardCount = await prisma.kanbanCard.count({ where: { colunaId: id } });
    if (cardCount > 0) {
      return NextResponse.json(
        { erro: `Não é possível excluir coluna com ${cardCount} card(s). Mova-os primeiro.` },
        { status: 400 }
      );
    }

    await prisma.kanbanColuna.delete({ where: { id } });
    return NextResponse.json({ mensagem: "Coluna excluída." });
  } catch (err) {
    console.error("[DELETE /api/kanban/colunas/[id]]", err);
    return NextResponse.json({ erro: "Erro ao excluir coluna." }, { status: 500 });
  }
}
