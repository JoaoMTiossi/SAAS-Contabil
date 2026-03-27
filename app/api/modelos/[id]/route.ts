import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const modelo = await prisma.modeloContrato.findUnique({
    where: { id },
    include: {
      gerados: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!modelo) {
    return NextResponse.json({ erro: "Modelo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(modelo);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.modeloContrato.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/modelos/:id]", err);
    return NextResponse.json({ erro: "Erro ao excluir modelo." }, { status: 500 });
  }
}
