/**
 * GET    /api/contratos/[id] — detalhe completo do contrato
 * PATCH  /api/contratos/[id] — atualiza status do contrato
 * DELETE /api/contratos/[id] — remove contrato e dados relacionados
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  cancelarAlertasContrato,
  sincronizarAlertasContrato,
} from "@/lib/scheduler";

const PatchContratoSchema = z.object({
  status: z.enum(["ativo", "encerrado", "renovado", "cancelado"]).optional(),
  identificador: z.string().optional(),
  contratante: z.string().nullable().optional(),
  contratado: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      parcelas: { orderBy: { numero: "asc" } },
      obrigacoes: { orderBy: { prazo: "asc" } },
      alertas: { orderBy: { dataAlerta: "asc" } },
    },
  });

  if (!contrato) {
    return NextResponse.json({ erro: "Contrato não encontrado." }, { status: 404 });
  }

  return NextResponse.json(contrato);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const body = await req.json();
    const data = PatchContratoSchema.parse(body);

    const contrato = await prisma.contrato.update({
      where: { id },
      data,
    });

    // Se encerrado ou cancelado → cancela alertas futuros
    if (data.status === "encerrado" || data.status === "cancelado") {
      await cancelarAlertasContrato(id);
    }

    // Se renovado → resincroniza alertas
    if (data.status === "renovado") {
      await sincronizarAlertasContrato(id);
    }

    return NextResponse.json(contrato);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/contratos/[id]]", err);
    return NextResponse.json({ erro: "Erro ao atualizar contrato." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    await prisma.contrato.delete({ where: { id } });
    return NextResponse.json({ mensagem: "Contrato removido com sucesso." });
  } catch {
    return NextResponse.json({ erro: "Contrato não encontrado." }, { status: 404 });
  }
}
