import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const escritorioId = url.searchParams.get("escritorioId") || undefined;
    const acao = url.searchParams.get("acao") || undefined;
    const de = url.searchParams.get("de") || undefined;
    const ate = url.searchParams.get("ate") || undefined;

    const where: Record<string, unknown> = {};

    if (escritorioId) {
      where.escritorioId = escritorioId;
    }

    if (acao) {
      where.acao = { contains: acao, mode: "insensitive" };
    }

    if (de || ate) {
      where.criadoEm = {};
      if (de) (where.criadoEm as Record<string, unknown>).gte = new Date(de);
      if (ate) {
        const dataAte = new Date(ate);
        dataAte.setHours(23, 59, 59, 999);
        (where.criadoEm as Record<string, unknown>).lte = dataAte;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.logAtividade.findMany({
        where,
        include: {
          escritorio: { select: { nome: true } },
        },
        orderBy: { criadoEm: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.logAtividade.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      paginas: Math.ceil(total / limit),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[GET /api/admin/logs]", err);
    return NextResponse.json({ erro: "Erro ao listar logs." }, { status: 500 });
  }
}
