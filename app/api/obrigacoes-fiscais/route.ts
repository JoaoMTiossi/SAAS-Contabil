/**
 * GET  /api/obrigacoes-fiscais — listar obrigações fiscais base
 * POST /api/obrigacoes-fiscais/seed — popular obrigações padrão
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedObrigacoesFiscais } from "@/lib/agents/agente-calendario-fiscal";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const obrigacoes = await prisma.obrigacaoFiscal.findMany({
      where: { ativo: true },
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    });
    return NextResponse.json({ obrigacoes });
  } catch (err) {
    console.error("[GET /api/obrigacoes-fiscais]", err);
    return NextResponse.json({ erro: "Erro ao listar obrigações." }, { status: 500 });
  }
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const criadas = await seedObrigacoesFiscais();
    return NextResponse.json({ mensagem: `${criadas} obrigações fiscais criadas.`, criadas });
  } catch (err) {
    console.error("[POST /api/obrigacoes-fiscais]", err);
    return NextResponse.json({ erro: "Erro ao popular obrigações." }, { status: 500 });
  }
}
