/**
 * GET    /api/templates-contrato/[id] — obter template
 * PATCH  /api/templates-contrato/[id] — atualizar template
 * DELETE /api/templates-contrato/[id] — desativar template
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.templateContrato.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ erro: "Template não encontrado." }, { status: 404 });
  return NextResponse.json(template);
}

const AtualizarTemplateSchema = z.object({
  nome: z.string().min(1).optional(),
  tipo: z.enum(["prestacao_servicos", "consultoria", "bpo", "aditivo", "distrato", "custom"]).optional(),
  conteudo: z.string().min(1).optional(),
  variaveis: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const data = AtualizarTemplateSchema.parse(body);

    // If content is updated, re-extract variables
    if (data.conteudo) {
      const regex = /\{\{(\w+)\}\}/g;
      const extractedVars: string[] = [];
      let match;
      while ((match = regex.exec(data.conteudo)) !== null) {
        if (!extractedVars.includes(match[1])) {
          extractedVars.push(match[1]);
        }
      }
      if (!data.variaveis) {
        data.variaveis = extractedVars;
      } else {
        data.variaveis = [...new Set([...data.variaveis, ...extractedVars])];
      }
    }

    const template = await prisma.templateContrato.update({
      where: { id },
      data,
    });

    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/templates-contrato/[id]]", err);
    return NextResponse.json({ erro: "Erro ao atualizar template." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.templateContrato.update({
      where: { id },
      data: { ativo: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/templates-contrato/[id]]", err);
    return NextResponse.json({ erro: "Erro ao remover template." }, { status: 500 });
  }
}
