import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

const AtualizarComunicadoSchema = z.object({
  titulo: z.string().min(1).optional(),
  mensagem: z.string().min(1).optional(),
  tipo: z.enum(["info", "aviso", "manutencao", "novidade"]).optional(),
  ativo: z.boolean().optional(),
  expiraEm: z.string().nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = AtualizarComunicadoSchema.parse(body);

    const comunicado = await prisma.comunicado.update({
      where: { id },
      data: {
        ...(data.titulo !== undefined && { titulo: data.titulo }),
        ...(data.mensagem !== undefined && { mensagem: data.mensagem }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.expiraEm !== undefined && { expiraEm: data.expiraEm ? new Date(data.expiraEm) : null }),
      },
    });

    return NextResponse.json(comunicado);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[PUT /api/admin/comunicados]", err);
    return NextResponse.json({ erro: "Erro ao atualizar comunicado." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.comunicado.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[DELETE /api/admin/comunicados]", err);
    return NextResponse.json({ erro: "Erro ao excluir comunicado." }, { status: 500 });
  }
}
