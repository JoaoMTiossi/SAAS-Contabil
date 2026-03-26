import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const escritorioId = url.searchParams.get("escritorioId") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    if (escritorioId) where.escritorioId = escritorioId;
    if (status) where.status = status;

    const [cobrancas, total, pendente, atrasado, pagoMes] = await Promise.all([
      prisma.cobranca.findMany({
        where,
        include: { escritorio: { select: { nome: true } } },
        orderBy: { vencimento: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cobranca.count({ where }),
      prisma.cobranca.aggregate({
        _sum: { valor: true },
        where: { ...where, status: "pendente" },
      }),
      prisma.cobranca.aggregate({
        _sum: { valor: true },
        where: { ...where, status: "atrasado" },
      }),
      prisma.cobranca.aggregate({
        _sum: { valor: true },
        where: {
          ...where,
          status: "pago",
          dataPagamento: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return NextResponse.json({
      cobrancas,
      total,
      paginas: Math.ceil(total / limit),
      resumo: {
        pendente: pendente._sum.valor ? Number(pendente._sum.valor) : 0,
        atrasado: atrasado._sum.valor ? Number(atrasado._sum.valor) : 0,
        pagoMes: pagoMes._sum.valor ? Number(pagoMes._sum.valor) : 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[GET /api/admin/cobranca]", err);
    return NextResponse.json({ erro: "Erro ao listar cobranças." }, { status: 500 });
  }
}

const CriarCobrancaSchema = z.object({
  escritorioId: z.string().min(1),
  descricao: z.string().min(1),
  valor: z.number().min(0),
  vencimento: z.string().min(1),
  observacao: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = CriarCobrancaSchema.parse(body);

    const cobranca = await prisma.cobranca.create({
      data: {
        escritorioId: data.escritorioId,
        descricao: data.descricao,
        valor: data.valor,
        vencimento: new Date(data.vencimento),
        observacao: data.observacao || null,
      },
      include: { escritorio: { select: { nome: true } } },
    });

    return NextResponse.json(cobranca, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[POST /api/admin/cobranca]", err);
    return NextResponse.json({ erro: "Erro ao criar cobrança." }, { status: 500 });
  }
}
