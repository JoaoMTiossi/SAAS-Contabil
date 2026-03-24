/**
 * GET  /api/contratos/[id]/versoes — listar versões
 * POST /api/contratos/[id]/versoes — criar nova versão (aditivo, reajuste, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { criarVersao, listarVersoes } from "@/lib/agents/agente-gestao-contratos";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const versoes = await listarVersoes(id);
    return NextResponse.json({ versoes });
  } catch (err) {
    console.error("[GET /api/contratos/[id]/versoes]", err);
    return NextResponse.json({ erro: "Erro ao listar versões." }, { status: 500 });
  }
}

const CriarVersaoSchema = z.object({
  tipo: z.enum(["original", "aditivo", "reajuste", "correcao"]),
  descricao: z.string().optional(),
  conteudo: z.string().min(1),
  criadoPorId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = CriarVersaoSchema.parse(body);
    const versao = await criarVersao({ contratoId: id, ...data });
    return NextResponse.json(versao, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/contratos/[id]/versoes]", err);
    return NextResponse.json({ erro: "Erro ao criar versão." }, { status: 500 });
  }
}
