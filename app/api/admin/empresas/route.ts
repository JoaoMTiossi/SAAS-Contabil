import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

const TODOS_MODULOS = [
  "dashboard", "contratos", "clientes", "honorarios",
  "calendario-fiscal", "rescisoes", "timesheet", "alertas", "configuracoes",
];

export async function GET() {
  try {
    await requireAdmin();
    const escritorios = await prisma.escritorio.findMany({
      include: {
        _count: { select: { usuarios: true, clientes: true } },
        modulos: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ escritorios });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[GET /api/admin/empresas]", err);
    return NextResponse.json({ erro: "Erro ao listar empresas." }, { status: 500 });
  }
}

const CriarEmpresaSchema = z.object({
  nome: z.string().min(1),
  cnpj: z.string().optional(),
  email: z.string().email(),
  modulos: z.array(z.string()).default(TODOS_MODULOS),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = CriarEmpresaSchema.parse(body);

    const escritorio = await prisma.escritorio.create({
      data: {
        nome: data.nome,
        cnpj: data.cnpj || null,
        email: data.email,
        modulos: {
          create: data.modulos.map((m) => ({ modulo: m })),
        },
      },
      include: {
        _count: { select: { usuarios: true, clientes: true } },
        modulos: true,
      },
    });

    return NextResponse.json(escritorio, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[POST /api/admin/empresas]", err);
    return NextResponse.json({ erro: "Erro ao criar empresa." }, { status: 500 });
  }
}
