import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

const AtualizarSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
  role: z.enum(["admin", "colaborador"]).optional(),
  escritorioId: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = AtualizarSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.nome) updateData.nome = data.nome;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.escritorioId) updateData.escritorioId = data.escritorioId;
    if (data.senha) updateData.senha = await bcrypt.hash(data.senha, 12);

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        escritorioId: true,
        createdAt: true,
        escritorio: { select: { nome: true } },
      },
    });

    return NextResponse.json(usuario);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[PUT /api/admin/usuarios]", err);
    return NextResponse.json({ erro: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.usuario.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[DELETE /api/admin/usuarios]", err);
    return NextResponse.json({ erro: "Erro ao excluir usuário." }, { status: 500 });
  }
}
