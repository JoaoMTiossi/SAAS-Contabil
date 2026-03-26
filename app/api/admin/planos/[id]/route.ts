import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

const AtualizarPlanoSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  preco: z.number().min(0).optional(),
  maxUsuarios: z.number().int().min(1).optional(),
  maxClientes: z.number().int().min(1).optional(),
  ativo: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = AtualizarPlanoSchema.parse(body);

    const plano = await prisma.plano.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.descricao !== undefined && { descricao: data.descricao || null }),
        ...(data.preco !== undefined && { preco: data.preco }),
        ...(data.maxUsuarios !== undefined && { maxUsuarios: data.maxUsuarios }),
        ...(data.maxClientes !== undefined && { maxClientes: data.maxClientes }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
      include: {
        _count: { select: { escritorios: true } },
      },
    });

    return NextResponse.json(plano);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[PUT /api/admin/planos]", err);
    return NextResponse.json({ erro: "Erro ao atualizar plano." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const plano = await prisma.plano.findUnique({
      where: { id },
      include: { _count: { select: { escritorios: true } } },
    });

    if (!plano) {
      return NextResponse.json({ erro: "Plano não encontrado." }, { status: 404 });
    }

    if (plano._count.escritorios > 0) {
      return NextResponse.json(
        { erro: `Este plano está sendo usado por ${plano._count.escritorios} escritório(s). Remova os vínculos antes de excluir.` },
        { status: 400 }
      );
    }

    await prisma.plano.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[DELETE /api/admin/planos]", err);
    return NextResponse.json({ erro: "Erro ao excluir plano." }, { status: 500 });
  }
}
