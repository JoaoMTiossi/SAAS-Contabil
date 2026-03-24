/**
 * PATCH /api/contratos/[id]/obrigacoes/[obrigacaoId]
 * Atualiza status de uma obrigação.
 * Ao marcar como entregue/cancelado → cancela alertas futuros da obrigação.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cancelarAlertasObrigacao } from "@/lib/scheduler";
import { getSession } from "@/lib/auth/session";

const PatchObrigacaoSchema = z.object({
  status: z.enum(["pendente", "entregue", "cancelado", "atrasado"]),
});

type Params = { params: Promise<{ id: string; obrigacaoId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id, obrigacaoId } = await params;

  try {
    const body = await req.json();
    const { status } = PatchObrigacaoSchema.parse(body);

    // Verify the obrigacao belongs to the specified contract
    const existing = await prisma.obrigacao.findFirst({
      where: { id: obrigacaoId, contratoId: id },
    });
    if (!existing) {
      return NextResponse.json({ erro: "Obrigação não encontrada neste contrato." }, { status: 404 });
    }

    const obrigacao = await prisma.obrigacao.update({
      where: { id: obrigacaoId },
      data: { status },
    });

    // Cancela alertas futuros quando concluída
    if (status === "entregue" || status === "cancelado") {
      await cancelarAlertasObrigacao(obrigacaoId);
    }

    return NextResponse.json(obrigacao);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Status inválido.", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH obrigacao]", err);
    return NextResponse.json({ erro: "Erro ao atualizar obrigação." }, { status: 500 });
  }
}
