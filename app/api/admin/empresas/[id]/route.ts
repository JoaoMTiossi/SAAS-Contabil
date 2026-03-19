import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

const AtualizarSchema = z.object({
  nome: z.string().min(1).optional(),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  modulos: z.array(z.string()).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = AtualizarSchema.parse(body);

    const escritorio = await prisma.escritorio.update({
      where: { id },
      data: {
        ...(data.nome && { nome: data.nome }),
        ...(data.cnpj !== undefined && { cnpj: data.cnpj || null }),
        ...(data.email && { email: data.email }),
      },
    });

    if (data.modulos) {
      await prisma.escritorioModulo.deleteMany({ where: { escritorioId: id } });
      await prisma.escritorioModulo.createMany({
        data: data.modulos.map((m) => ({ escritorioId: id, modulo: m })),
      });
    }

    const result = await prisma.escritorio.findUnique({
      where: { id: escritorio.id },
      include: {
        _count: { select: { usuarios: true, clientes: true } },
        modulos: true,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[PUT /api/admin/empresas]", err);
    return NextResponse.json({ erro: "Erro ao atualizar empresa." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.escritorio.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[DELETE /api/admin/empresas]", err);
    return NextResponse.json({ erro: "Erro ao excluir empresa." }, { status: 500 });
  }
}
