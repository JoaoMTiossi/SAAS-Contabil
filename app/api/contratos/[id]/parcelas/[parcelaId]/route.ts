/**
 * PATCH /api/contratos/[id]/parcelas/[parcelaId]
 * Atualiza status de uma parcela.
 * Ao marcar como pago/cancelado → cancela alertas futuros da parcela.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cancelarAlertasParcela } from "@/lib/scheduler";

const PatchParcelaSchema = z.object({
  status: z.enum(["pendente", "pago", "cancelado", "atrasado"]),
});

type Params = { params: Promise<{ id: string; parcelaId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, parcelaId } = await params;

  try {
    const body = await req.json();
    const { status } = PatchParcelaSchema.parse(body);

    // Verify the parcela belongs to the specified contract
    const existing = await prisma.parcela.findFirst({
      where: { id: parcelaId, contratoId: id },
    });
    if (!existing) {
      return NextResponse.json({ erro: "Parcela não encontrada neste contrato." }, { status: 404 });
    }

    const parcela = await prisma.parcela.update({
      where: { id: parcelaId },
      data: { status },
    });

    // Cancela alertas futuros quando concluída
    if (status === "pago" || status === "cancelado") {
      await cancelarAlertasParcela(parcelaId);
    }

    return NextResponse.json(parcela);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Status inválido.", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH parcela]", err);
    return NextResponse.json({ erro: "Erro ao atualizar parcela." }, { status: 500 });
  }
}
