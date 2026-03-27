/**
 * GET  /api/contratos — lista contratos com filtros
 * POST /api/contratos — cria um contrato + gera alertas automáticos
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarAlertasContrato } from "@/lib/scheduler";
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

const ParcelaSchema = z.object({
  numero: z.number().int().positive(),
  descricao: z.string().nullable().optional(),
  valor: z.string().nullable().optional(),
  vencimento: z.string().nullable().optional(), // DD/MM/AAAA
});

const ObrigacaoSchema = z.object({
  descricao: z.string().min(1),
  responsavel: z.enum(["contratante", "contratado"]).nullable().optional(),
  prazo: z.string().nullable().optional(), // DD/MM/AAAA
});

const CriarContratoSchema = z.object({
  identificador: z.string().nullable().optional(),
  contratante: z.string().nullable().optional(),
  contratado: z.string().nullable().optional(),
  cnpjContratante: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v: string | null | undefined) => !v || isValidCnpj(v),
      { message: "CNPJ do contratante inválido." }
    ),
  cnpjContratado: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v: string | null | undefined) => !v || isValidCnpj(v),
      { message: "CNPJ do contratado inválido." }
    ),
  emailContratante: z
    .string()
    .email("E-mail do contratante inválido.")
    .nullable()
    .optional(),
  emailContratado: z
    .string()
    .email("E-mail do contratado inválido.")
    .nullable()
    .optional(),
  dataInicio: z.string().nullable().optional(),
  dataFim: z.string().nullable().optional(),
  renovacaoAutomatica: z.boolean().nullable().optional(),
  prazoAvisoCancelamento: z.string().nullable().optional(),
  textoOriginal: z.string().nullable().optional(),
  confiancaVencimento: z.enum(["alta", "media", "baixa"]).default("baixa"),
  confiancaParcelas: z.enum(["alta", "media", "baixa"]).default("baixa"),
  confiancaObrigacoes: z.enum(["alta", "media", "baixa"]).default("baixa"),
  parcelas: z.array(ParcelaSchema).default([]),
  obrigacoes: z.array(ObrigacaoSchema).default([]),
  clienteId: z.string().nullable().optional(),
});

// ─── Helper: parse DD/MM/AAAA → Date ──────────────────────────────

function parseDateBR(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/");
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

function parseValorDecimal(valorStr: string | null | undefined): number | null {
  if (!valorStr) return null;
  const cleaned = valorStr.replace(/R\$\s*/, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ─── GET ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const escritorioId = searchParams.get("escritorioId");
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") ?? "1") || 1);
    const porPagina = Math.min(100, Math.max(1, parseInt(searchParams.get("porPagina") ?? "20") || 20));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Filter by escritorio's clients if escritorioId provided
    if (escritorioId) {
      const clienteIds = (
        await prisma.cliente.findMany({
          where: { escritorioId },
          select: { id: true },
        })
      ).map((c: { id: string }) => c.id);

      if (clienteIds.length > 0) {
        where.OR = [
          { clienteId: { in: clienteIds } },
          { clienteId: null },
        ];
      }
    }

    const [total, contratos] = await Promise.all([
      prisma.contrato.count({ where }),
      prisma.contrato.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        include: {
          _count: { select: { parcelas: true, obrigacoes: true, alertas: true } },
        },
      }),
    ]);

    return NextResponse.json({ total, pagina, porPagina, contratos });
  } catch (err) {
    console.error("[GET /api/contratos]", err);
    return NextResponse.json({ erro: "Erro ao listar contratos." }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CriarContratoSchema.parse(body);

    const contrato = await prisma.contrato.create({
      data: {
        identificador: data.identificador ?? null,
        contratante: data.contratante ?? null,
        contratado: data.contratado ?? null,
        clienteId: data.clienteId ?? null,
        dataInicio: parseDateBR(data.dataInicio),
        dataFim: parseDateBR(data.dataFim),
        renovacaoAutomatica: data.renovacaoAutomatica ?? null,
        prazoAvisoCancelamento: parseDateBR(data.prazoAvisoCancelamento),
        textoOriginal: data.textoOriginal ?? null,
        confiancaVencimento: data.confiancaVencimento,
        confiancaParcelas: data.confiancaParcelas,
        confiancaObrigacoes: data.confiancaObrigacoes,
        parcelas: {
          create: data.parcelas.map((p: { numero: number; descricao?: string | null; valor?: string | null; vencimento?: string | null }) => ({
            numero: p.numero,
            descricao: p.descricao ?? null,
            valor: parseValorDecimal(p.valor),
            vencimento: parseDateBR(p.vencimento),
          })),
        },
        obrigacoes: {
          create: data.obrigacoes.map((o: { descricao: string; responsavel?: string | null; prazo?: string | null }) => ({
            descricao: o.descricao,
            responsavel: o.responsavel ?? null,
            prazo: parseDateBR(o.prazo),
          })),
        },
      },
    });

    // Gera alertas automaticamente após criar
    try {
      await sincronizarAlertasContrato(contrato.id);
    } catch (alertErr) {
      console.error("[POST /api/contratos] Erro ao gerar alertas:", alertErr);
    }

    const contratoCompleto = await prisma.contrato.findUnique({
      where: { id: contrato.id },
      include: { parcelas: true, obrigacoes: true, alertas: true },
    });

    return NextResponse.json(contratoCompleto, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/contratos]", err);
    return NextResponse.json({ erro: "Erro ao criar contrato." }, { status: 500 });
  }
}
