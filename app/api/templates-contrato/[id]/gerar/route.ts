/**
 * POST /api/templates-contrato/[id]/gerar — gerar contrato a partir do template
 * Substitui as variáveis {{variavel}} pelos valores enviados e salva o contrato.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

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

function parseDateBR(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/");
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

const GerarContratoSchema = z.object({
  valores: z.record(z.string(), z.string()),
  identificador: z.string().nullable().optional(),
  contratante: z.string().nullable().optional(),
  contratado: z.string().nullable().optional(),
  cnpjContratante: z
    .string()
    .nullable()
    .optional()
    .refine((v: string | null | undefined) => !v || isValidCnpj(v), { message: "CNPJ do contratante inválido." }),
  cnpjContratado: z
    .string()
    .nullable()
    .optional()
    .refine((v: string | null | undefined) => !v || isValidCnpj(v), { message: "CNPJ do contratado inválido." }),
  emailContratante: z.string().email("E-mail do contratante inválido.").nullable().optional(),
  emailContratado: z.string().email("E-mail do contratado inválido.").nullable().optional(),
  dataInicio: z.string().nullable().optional(),
  dataFim: z.string().nullable().optional(),
  clienteId: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const template = await prisma.templateContrato.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ erro: "Template não encontrado." }, { status: 404 });
    }

    const body = await req.json();
    const data = GerarContratoSchema.parse(body);

    // Replace variables in template content
    let conteudoFinal = template.conteudo;
    for (const [key, value] of Object.entries(data.valores)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      conteudoFinal = conteudoFinal.replace(regex, value);
    }

    // Create the contract from the filled template
    const contrato = await prisma.contrato.create({
      data: {
        identificador: data.identificador ?? null,
        contratante: data.contratante ?? null,
        contratado: data.contratado ?? null,
        clienteId: data.clienteId ?? null,
        dataInicio: parseDateBR(data.dataInicio),
        dataFim: parseDateBR(data.dataFim),
        textoOriginal: conteudoFinal,
        status: "ativo",
        confiancaVencimento: "alta",
        confiancaParcelas: "alta",
        confiancaObrigacoes: "alta",
      },
    });

    // Create initial version
    await prisma.contratoVersao.create({
      data: {
        contratoId: contrato.id,
        versao: 1,
        tipo: "original",
        descricao: `Gerado a partir do template "${template.nome}"`,
        conteudo: conteudoFinal,
      },
    });

    // Create event
    await prisma.contratoEvento.create({
      data: {
        contratoId: contrato.id,
        tipo: "criacao",
        descricao: `Contrato gerado a partir do template "${template.nome}"`,
      },
    });

    const contratoCompleto = await prisma.contrato.findUnique({
      where: { id: contrato.id },
      include: { parcelas: true, obrigacoes: true, versoes: true },
    });

    return NextResponse.json(contratoCompleto, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/templates-contrato/[id]/gerar]", err);
    return NextResponse.json({ erro: "Erro ao gerar contrato." }, { status: 500 });
  }
}
