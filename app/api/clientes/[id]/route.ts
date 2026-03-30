/**
 * DELETE /api/clientes/[id] — excluir um cliente por ID
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify the client exists and belongs to the user's escritório
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { escritorioId: true },
    });

    if (!cliente) {
      return NextResponse.json(
        { erro: "Cliente não encontrado." },
        { status: 404 },
      );
    }

    // Check that the client belongs to the user's escritório
    const user = session.user as { escritorioId?: string };
    if (user.escritorioId && cliente.escritorioId !== user.escritorioId) {
      return NextResponse.json(
        { erro: "Sem permissão para excluir este cliente." },
        { status: 403 },
      );
    }

    await prisma.cliente.delete({ where: { id } });

    return NextResponse.json({ mensagem: "Cliente excluído com sucesso." });
  } catch (err) {
    console.error("[DELETE /api/clientes/[id]]", err);
    return NextResponse.json(
      { erro: "Erro ao excluir cliente. Verifique se não há registros dependentes." },
      { status: 500 },
    );
  }
}
