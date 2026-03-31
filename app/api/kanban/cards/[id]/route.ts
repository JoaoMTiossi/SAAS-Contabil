/**
 * PATCH  /api/kanban/cards/[id] — editar campos do card de rescisão
 * DELETE /api/kanban/cards/[id] — excluir card
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

const EditarCardSchema = z.object({
  motivo: z.string().nullable().optional(),
  dataPrevisao: z
    .string()
    .nullable()
    .optional()
    .transform((s: string | null | undefined) => (s ? new Date(s) : null))
    .refine((d: Date | null) => d === null || !isNaN(d.getTime()), { message: "Data inválida" }),
  observacao: z.string().nullable().optional(),
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
    const data = EditarCardSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.motivo !== undefined) updateData.motivo = data.motivo;
    if (data.dataPrevisao !== undefined) updateData.dataPrevisao = data.dataPrevisao;
    if (data.observacao !== undefined) updateData.observacao = data.observacao;

    const card = await prisma.kanbanCard.update({
      where: { id },
      data: updateData,
      include: {
        contrato: { select: { identificador: true, contratante: true, contratado: true } },
        cliente: { select: { razaoSocial: true } },
        checklists: { orderBy: { ordem: "asc" } },
      },
    });

    return NextResponse.json(card);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[PATCH /api/kanban/cards/[id]]", err);
    return NextResponse.json({ erro: message }, { status: 400 });
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
    await prisma.kanbanCard.delete({ where: { id } });
    return NextResponse.json({ mensagem: "Card excluído com sucesso." });
  } catch (err) {
    console.error("[DELETE /api/kanban/cards/[id]]", err);
    return NextResponse.json({ erro: "Erro ao excluir card." }, { status: 500 });
  }
}
