/**
 * GET  /api/contratos — lista contratos com filtros
 * POST /api/contratos — cria um contrato + gera alertas automáticos
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarAlertasContrato } from "@/lib/scheduler";
import { parseISO } from "date-fns";

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
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const pagina = parseInt(searchParams.get("pagina") ?? "1");
  const porPagina = parseInt(searchParams.get("porPagina") ?? "20");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

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
}

// ─── POST ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CriarContratoSchema.parse(body);

    const contrato = await prisma.contrato.create({
      data: {
        identificador: data.identificador ?? null,
        contratante: data.contratante ?? null,
        contratado: data.contratado ?? null,
        dataInicio: parseDateBR(data.dataInicio),
        dataFim: parseDateBR(data.dataFim),
        renovacaoAutomatica: data.renovacaoAutomatica ?? null,
        prazoAvisoCancelamento: parseDateBR(data.prazoAvisoCancelamento),
        textoOriginal: data.textoOriginal ?? null,
        confiancaVencimento: data.confiancaVencimento,
        confiancaParcelas: data.confiancaParcelas,
        confiancaObrigacoes: data.confiancaObrigacoes,
        parcelas: {
          create: data.parcelas.map((p) => ({
            numero: p.numero,
            descricao: p.descricao ?? null,
            valor: parseValorDecimal(p.valor),
            vencimento: parseDateBR(p.vencimento),
          })),
        },
        obrigacoes: {
          create: data.obrigacoes.map((o) => ({
            descricao: o.descricao,
            responsavel: o.responsavel ?? null,
            prazo: parseDateBR(o.prazo),
          })),
        },
      },
    });

    // Gera alertas automaticamente após criar
    await sincronizarAlertasContrato(contrato.id);

    const contratoCompleto = await prisma.contrato.findUnique({
      where: { id: contrato.id },
      include: { parcelas: true, obrigacoes: true, alertas: true },
    });

    return NextResponse.json(contratoCompleto, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/contratos]", err);
    return NextResponse.json({ erro: "Erro ao criar contrato." }, { status: 500 });
  }
}
