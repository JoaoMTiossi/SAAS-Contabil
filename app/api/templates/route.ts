/**
 * GET  /api/templates?escritorioId=xxx — listar templates
 * POST /api/templates — criar template customizado
 */

import { NextRequest, NextResponse } from "next/server";
import { listarTemplates, criarTemplate } from "@/lib/agents/agente-geracao-contratos";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const templates = await listarTemplates(escritorioId);
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[GET /api/templates]", err);
    return NextResponse.json({ erro: "Erro ao listar templates." }, { status: 500 });
  }
}

const CriarTemplateSchema = z.object({
  escritorioId: z.string(),
  nome: z.string().min(1),
  tipo: z.enum(["prestacao_servicos", "consultoria", "bpo", "aditivo", "distrato", "custom"]),
  conteudo: z.string().min(1),
  variaveis: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CriarTemplateSchema.parse(body);
    const template = await criarTemplate(data);
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/templates]", err);
    return NextResponse.json({ erro: "Erro ao criar template." }, { status: 500 });
  }
}
