/**
 * GET  /api/honorarios?escritorioId=xxx — listar honorários
 * POST /api/honorarios — criar honorário
 */

import { NextRequest, NextResponse } from "next/server";
import { criarHonorario, listarHonorarios } from "@/lib/agents/agente-cobranca";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where: { escritorioId },
      select: { id: true },
    });
    const honorarios = await listarHonorarios(clientes.map((c) => c.id));
    return NextResponse.json({ honorarios });
  } catch (err) {
    console.error("[GET /api/honorarios]", err);
    return NextResponse.json({ erro: "Erro ao listar honorários." }, { status: 500 });
  }
}

const CriarHonorarioSchema = z.object({
  clienteId: z.string(),
  contratoId: z.string().optional(),
  valor: z.number().positive(),
  periodicidade: z.enum(["mensal", "trimestral", "anual"]).optional(),
  diaVencimento: z.number().int().min(1).max(31),
  indiceReajuste: z.string().optional(),
  percentualReajuste: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CriarHonorarioSchema.parse(body);
    const honorario = await criarHonorario(data);
    return NextResponse.json(honorario, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/honorarios]", err);
    return NextResponse.json({ erro: "Erro ao criar honorário." }, { status: 500 });
  }
}
