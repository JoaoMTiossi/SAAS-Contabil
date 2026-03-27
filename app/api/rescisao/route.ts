import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CriarRescisaoSchema = z.object({
  contratoId: z.string().min(1),
  motivo: z.string().nullable().optional(),
  responsavel: z.string().nullable().optional(),
  dataPrevisao: z.string().nullable().optional(), // DD/MM/AAAA
  observacoes: z.string().nullable().optional(),
});

function parseDateBR(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/");
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const rescisoes = await prisma.rescisaoKanban.findMany({
    include: {
      contrato: {
        select: {
          id: true,
          identificador: true,
          contratante: true,
          contratado: true,
          dataFim: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rescisoes);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CriarRescisaoSchema.parse(body);

    // Verifica se já existe rescisão para este contrato
    const existente = await prisma.rescisaoKanban.findUnique({
      where: { contratoId: data.contratoId },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Já existe um processo de rescisão para este contrato." },
        { status: 409 }
      );
    }

    const rescisao = await prisma.rescisaoKanban.create({
      data: {
        contratoId: data.contratoId,
        motivo: data.motivo ?? null,
        responsavel: data.responsavel ?? null,
        dataPrevisao: parseDateBR(data.dataPrevisao),
        observacoes: data.observacoes ?? null,
      },
      include: {
        contrato: {
          select: {
            id: true,
            identificador: true,
            contratante: true,
            contratado: true,
          },
        },
      },
    });

    return NextResponse.json(rescisao, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/rescisao]", err);
    return NextResponse.json({ erro: "Erro ao criar rescisão." }, { status: 500 });
  }
}
