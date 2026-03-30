/**
 * GET /api/contratos/assinados — lista contratos totalmente assinados
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const escritorioId = searchParams.get("escritorioId");

    if (!escritorioId) {
      return NextResponse.json(
        { erro: "escritorioId é obrigatório." },
        { status: 400 }
      );
    }

    // Get all client IDs belonging to this escritório
    const clienteIds = (
      await prisma.cliente.findMany({
        where: { escritorioId },
        select: { id: true },
      })
    ).map((c: { id: string }) => c.id);

    if (clienteIds.length === 0) {
      return NextResponse.json({ contratos: [] });
    }

    // Find contracts that belong to the escritório's clients,
    // have at least one assinatura, and ALL assinaturas have status "assinado"
    const contratos = await prisma.contrato.findMany({
      where: {
        clienteId: { in: clienteIds },
        assinaturas: {
          some: {},
          none: { status: { not: "assinado" } },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        identificador: true,
        contratante: true,
        contratado: true,
        dataInicio: true,
        dataFim: true,
        status: true,
        assinaturas: {
          select: {
            nome: true,
            email: true,
            papel: true,
            status: true,
            assinadoEm: true,
          },
        },
      },
    });

    return NextResponse.json({ contratos });
  } catch (err) {
    console.error("[GET /api/contratos/assinados]", err);
    return NextResponse.json(
      { erro: "Erro ao listar contratos assinados." },
      { status: 500 }
    );
  }
}
