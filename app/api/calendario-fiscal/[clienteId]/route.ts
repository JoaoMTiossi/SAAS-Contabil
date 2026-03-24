/**
 * GET   /api/calendario-fiscal/[clienteId]?competencia=2026-03
 * PATCH /api/calendario-fiscal/[clienteId] — atualizar status de uma obrigação
 */

import { NextRequest, NextResponse } from "next/server";
import { obterCalendarioCliente, atualizarStatusObrigacao } from "@/lib/agents/agente-calendario-fiscal";
import { format } from "date-fns";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { clienteId } = await params;
  const competencia = req.nextUrl.searchParams.get("competencia") ?? format(new Date(), "yyyy-MM");

  try {
    const calendario = await obterCalendarioCliente(clienteId, competencia);
    return NextResponse.json({ competencia, itens: calendario });
  } catch (err) {
    console.error("[GET /api/calendario-fiscal/[clienteId]]", err);
    return NextResponse.json({ erro: "Erro ao obter calendário." }, { status: 500 });
  }
}

const AtualizarSchema = z.object({
  id: z.string(),
  status: z.enum(["pendente", "em_andamento", "entregue", "atrasada"]),
  responsavelId: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = AtualizarSchema.parse(body);
    const resultado = await atualizarStatusObrigacao(data.id, data.status, data.responsavelId);
    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/calendario-fiscal/[clienteId]]", err);
    return NextResponse.json({ erro: "Erro ao atualizar." }, { status: 500 });
  }
}
