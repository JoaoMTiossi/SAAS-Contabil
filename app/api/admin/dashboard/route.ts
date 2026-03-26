import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Gerar últimos 6 meses para crescimento
    const meses: { inicio: Date; fim: Date; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses.push({ inicio, fim, label });
    }

    const [
      totalEscritorios,
      totalUsuarios,
      totalClientes,
      totalContratos,
      escritoriosAtivos,
      escritoriosSuspensos,
      escritoriosBloqueados,
      receitaMensalAgg,
      inadimplencia,
      novasEmpresas,
      novosUsuarios,
      topEscritorios,
      ...crescimentoCounts
    ] = await Promise.all([
      prisma.escritorio.count(),
      prisma.usuario.count(),
      prisma.cliente.count(),
      prisma.contrato.count(),
      prisma.escritorio.count({ where: { status: "ativo" } }),
      prisma.escritorio.count({ where: { status: "suspenso" } }),
      prisma.escritorio.count({ where: { status: "bloqueado" } }),
      prisma.cobranca.aggregate({
        _sum: { valor: true },
        where: {
          status: "pago",
          dataPagamento: { gte: inicioMes, lte: fimMes },
        },
      }),
      prisma.cobranca.count({ where: { status: "atrasado" } }),
      prisma.escritorio.count({ where: { createdAt: { gte: trintaDiasAtras } } }),
      prisma.usuario.count({ where: { createdAt: { gte: trintaDiasAtras } } }),
      prisma.escritorio.findMany({
        orderBy: { clientes: { _count: "desc" } },
        take: 5,
        select: {
          id: true,
          nome: true,
          _count: { select: { usuarios: true, clientes: true } },
        },
      }),
      ...meses.map((m) =>
        prisma.escritorio.count({
          where: { createdAt: { gte: m.inicio, lte: m.fim } },
        })
      ),
    ]);

    const receitaMensal = receitaMensalAgg._sum.valor
      ? Number(receitaMensalAgg._sum.valor)
      : 0;

    const crescimentoMensal = meses.map((m, i) => ({
      mes: m.label,
      total: crescimentoCounts[i] as number,
    }));

    return NextResponse.json({
      totalEscritorios,
      totalUsuarios,
      totalClientes,
      totalContratos,
      escritoriosAtivos,
      escritoriosSuspensos,
      escritoriosBloqueados,
      receitaMensal,
      inadimplencia,
      novasEmpresas,
      novosUsuarios,
      topEscritorios,
      crescimentoMensal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[GET /api/admin/dashboard]", err);
    return NextResponse.json({ erro: "Erro ao carregar dashboard." }, { status: 500 });
  }
}
