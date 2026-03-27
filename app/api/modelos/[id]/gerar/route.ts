import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const GerarContratoSchema = z.object({
  identificador: z.string().nullable().optional(),
  dados: z.record(z.string(), z.string()),
  emailDestinatario: z.string().email().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = GerarContratoSchema.parse(body);

    const modelo = await prisma.modeloContrato.findUnique({ where: { id } });
    if (!modelo) {
      return NextResponse.json({ erro: "Modelo não encontrado." }, { status: 404 });
    }

    // Substituir variáveis no HTML
    let conteudoHtml = modelo.conteudoHtml;
    for (const [key, value] of Object.entries(data.dados)) {
      conteudoHtml = conteudoHtml.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        value
      );
    }

    const gerado = await prisma.contratoGerado.create({
      data: {
        modeloId: id,
        identificador: data.identificador ?? null,
        dados: data.dados,
        conteudoHtml,
        emailDestinatario: data.emailDestinatario ?? null,
      },
    });

    return NextResponse.json(gerado, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/modelos/:id/gerar]", err);
    return NextResponse.json({ erro: "Erro ao gerar contrato." }, { status: 500 });
  }
}
