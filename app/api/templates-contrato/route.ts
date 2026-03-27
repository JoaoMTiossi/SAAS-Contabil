/**
 * GET  /api/templates-contrato — listar templates
 * POST /api/templates-contrato — criar template manualmente
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

const CriarTemplateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  tipo: z.enum(["prestacao_servicos", "consultoria", "bpo", "aditivo", "distrato", "custom"]),
  conteudo: z.string().min(1, "Conteúdo é obrigatório."),
  variaveis: z.array(z.string()).default([]),
  escritorioId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const escritorioId = req.nextUrl.searchParams.get("escritorioId");

    const where: Record<string, unknown> = { ativo: true };
    if (escritorioId) {
      where.OR = [
        { escritorioId },
        { escritorioId: null },
      ];
    }

    const templates = await prisma.templateContrato.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[GET /api/templates-contrato]", err);
    return NextResponse.json({ erro: "Erro ao listar templates." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CriarTemplateSchema.parse(body);

    // Extract variables from content (pattern: {{variable}})
    const regex = /\{\{(\w+)\}\}/g;
    const extractedVars: string[] = [];
    let match;
    while ((match = regex.exec(data.conteudo)) !== null) {
      if (!extractedVars.includes(match[1])) {
        extractedVars.push(match[1]);
      }
    }

    // Merge explicitly provided variables with extracted ones
    const allVars = [...new Set([...data.variaveis, ...extractedVars])];

    const template = await prisma.templateContrato.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        conteudo: data.conteudo,
        variaveis: allVars,
        escritorioId: data.escritorioId,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/templates-contrato]", err);
    return NextResponse.json({ erro: "Erro ao criar template." }, { status: 500 });
  }
}
