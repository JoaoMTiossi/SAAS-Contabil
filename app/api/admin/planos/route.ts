import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
    const planos = await prisma.plano.findMany({
      include: {
        _count: { select: { escritorios: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ planos });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[GET /api/admin/planos]", err);
    return NextResponse.json({ erro: "Erro ao listar planos." }, { status: 500 });
  }
}

const CriarPlanoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  preco: z.number().min(0),
  maxUsuarios: z.number().int().min(1),
  maxClientes: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = CriarPlanoSchema.parse(body);

    const plano = await prisma.plano.create({
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        preco: data.preco,
        maxUsuarios: data.maxUsuarios,
        maxClientes: data.maxClientes,
      },
      include: {
        _count: { select: { escritorios: true } },
      },
    });

    return NextResponse.json(plano, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[POST /api/admin/planos]", err);
    return NextResponse.json({ erro: "Erro ao criar plano." }, { status: 500 });
  }
}
