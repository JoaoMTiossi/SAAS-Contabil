import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const PatchRescisaoSchema = z.object({
  estagio: z.enum(["notificado", "em_negociacao", "aguardando_documentos", "concluido"]).optional(),
  motivo: z.string().nullable().optional(),
  responsavel: z.string().nullable().optional(),
  dataPrevisao: z.string().nullable().optional(), // DD/MM/AAAA
  observacoes: z.string().nullable().optional(),
});

function parseDateBR(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/");
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = PatchRescisaoSchema.parse(body);

    const rescisao = await prisma.rescisaoKanban.update({
      where: { id },
      data: {
        ...(data.estagio !== undefined && { estagio: data.estagio }),
        ...(data.motivo !== undefined && { motivo: data.motivo }),
        ...(data.responsavel !== undefined && { responsavel: data.responsavel }),
        ...(data.dataPrevisao !== undefined && { dataPrevisao: parseDateBR(data.dataPrevisao) }),
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
      include: {
        contrato: {
          select: {
            id: true,
            identificador: true,
            contratante: true,
            contratado: true,
          },
        },
      },
    });

    return NextResponse.json(rescisao);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
    }
    console.error("[PATCH /api/rescisao/:id]", err);
    return NextResponse.json({ erro: "Erro ao atualizar rescisão." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.rescisaoKanban.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/rescisao/:id]", err);
    return NextResponse.json({ erro: "Erro ao remover rescisão." }, { status: 500 });
  }
}
