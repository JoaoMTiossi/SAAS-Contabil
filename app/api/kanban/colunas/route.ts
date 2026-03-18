/**
 * POST /api/kanban/colunas — adicionar coluna
 * PUT  /api/kanban/colunas — reordenar colunas
 */

import { NextRequest, NextResponse } from "next/server";
import { adicionarColuna, reordenarColunas } from "@/lib/agents/agente-rescisao";
import { z } from "zod";

const AdicionarSchema = z.object({
  boardId: z.string(),
  nome: z.string().min(1),
  ordem: z.number().int(),
  cor: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = AdicionarSchema.parse(body);
    const coluna = await adicionarColuna(data.boardId, data);
    return NextResponse.json(coluna, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/kanban/colunas]", err);
    return NextResponse.json({ erro: "Erro ao criar coluna." }, { status: 500 });
  }
}

const ReordenarSchema = z.object({
  colunas: z.array(z.object({ id: z.string(), ordem: z.number().int() })),
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ReordenarSchema.parse(body);
    await reordenarColunas(data.colunas);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PUT /api/kanban/colunas]", err);
    return NextResponse.json({ erro: "Erro ao reordenar." }, { status: 500 });
  }
}
