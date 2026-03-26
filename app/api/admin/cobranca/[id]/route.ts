import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

const AtualizarCobrancaSchema = z.object({
  status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).optional(),
  dataPagamento: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = AtualizarCobrancaSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "pago" && !data.dataPagamento) {
        updateData.dataPagamento = new Date();
      }
    }

    if (data.dataPagamento !== undefined) {
      updateData.dataPagamento = data.dataPagamento ? new Date(data.dataPagamento) : null;
    }

    if (data.observacao !== undefined) {
      updateData.observacao = data.observacao;
    }

    const cobranca = await prisma.cobranca.update({
      where: { id },
      data: updateData,
      include: { escritorio: { select: { nome: true } } },
    });

    return NextResponse.json(cobranca);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[PATCH /api/admin/cobranca]", err);
    return NextResponse.json({ erro: "Erro ao atualizar cobrança." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.cobranca.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[DELETE /api/admin/cobranca]", err);
    return NextResponse.json({ erro: "Erro ao excluir cobrança." }, { status: 500 });
  }
}
