/**
 * GET  /api/clientes?escritorioId=xxx — listar clientes do escritório
 * POST /api/clientes — criar um novo cliente
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

// ─── CNPJ Validator ─────────────────────────────────────────────

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const calc = (size: number): number => {
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += Number(digits.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return calc(12) === Number(digits.charAt(12)) && calc(13) === Number(digits.charAt(13));
}

// ─── Schema de validação ───────────────────────────────────────────

const CriarClienteSchema = z.object({
  razaoSocial: z.string().min(1, "Razão social é obrigatória."),
  nomeFantasia: z.string().nullable().optional(),
  cnpj: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => !v || isValidCnpj(v),
      { message: "CNPJ inválido." }
    ),
  email: z.string().email("E-mail inválido.").nullable().optional(),
  telefone: z.string().nullable().optional(),
  regimeTributario: z
    .enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"])
    .nullable()
    .optional(),
  escritorioId: z.string().min(1, "escritorioId é obrigatório."),
});

// ─── GET ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const escritorioId = req.nextUrl.searchParams.get("escritorioId");

  if (!escritorioId) {
    return NextResponse.json(
      { erro: "escritorioId é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            contratos: true,
            honorarios: true,
          },
        },
      },
    });

    return NextResponse.json({ clientes });
  } catch (err) {
    console.error("[GET /api/clientes]", err);
    return NextResponse.json(
      { erro: "Erro ao listar clientes." },
      { status: 500 },
    );
  }
}

// ─── POST ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CriarClienteSchema.parse(body);

    // Validate that escritorio exists
    const escritorio = await prisma.escritorio.findUnique({
      where: { id: data.escritorioId },
    });
    if (!escritorio) {
      return NextResponse.json(
        { erro: "Escritório não encontrado. Verifique o escritorioId." },
        { status: 404 },
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia ?? null,
        cnpj: data.cnpj ?? null,
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        regimeTributario: data.regimeTributario ?? null,
        escritorioId: data.escritorioId,
      },
      include: {
        _count: {
          select: {
            contratos: true,
            honorarios: true,
          },
        },
      },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: err.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/clientes]", err);
    return NextResponse.json(
      { erro: "Erro ao criar cliente." },
      { status: 500 },
    );
  }
}
