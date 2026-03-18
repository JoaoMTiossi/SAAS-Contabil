/**
 * GET  /api/contratos/[id]/assinaturas — status das assinaturas
 * POST /api/contratos/[id]/assinaturas — criar pedidos de assinatura
 */

import { NextRequest, NextResponse } from "next/server";
import {
  criarPedidosAssinatura,
  statusAssinaturas,
} from "@/lib/agents/agente-assinatura";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const assinaturas = await statusAssinaturas(id);
    return NextResponse.json({ assinaturas });
  } catch (err) {
    console.error("[GET /api/contratos/[id]/assinaturas]", err);
    return NextResponse.json({ erro: "Erro ao obter assinaturas." }, { status: 500 });
  }
}

const CriarAssinaturaSchema = z.object({
  signatarios: z.array(
    z.object({
      nome: z.string().min(1),
      email: z.string().email(),
      papel: z.string().min(1),
    })
  ).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = CriarAssinaturaSchema.parse(body);
    const assinaturas = await criarPedidosAssinatura({
      contratoId: id,
      signatarios: data.signatarios,
    });
    return NextResponse.json({ assinaturas }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/contratos/[id]/assinaturas]", err);
    return NextResponse.json({ erro: "Erro ao criar assinaturas." }, { status: 500 });
  }
}
