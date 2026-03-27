import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const EnviarSchema = z.object({
  contratoGeradoId: z.string().min(1),
  email: z.string().email("E-mail inválido"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = EnviarSchema.parse(body);

    const gerado = await prisma.contratoGerado.findFirst({
      where: { id: data.contratoGeradoId, modeloId: id },
      include: { modelo: { select: { nome: true } } },
    });

    if (!gerado) {
      return NextResponse.json({ erro: "Contrato gerado não encontrado." }, { status: 404 });
    }

    // TODO: Integrar com serviço de e-mail real (Resend, SendGrid, etc.)
    // Por enquanto, marca como enviado e loga no console
    console.log(`[ENVIO] Contrato "${gerado.modelo.nome}" enviado para ${data.email}`);
    console.log(`[ENVIO] ID: ${gerado.id}, Modelo: ${id}`);

    await prisma.contratoGerado.update({
      where: { id: gerado.id },
      data: {
        status: "enviado",
        emailDestinatario: data.email,
        dataEnvio: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      mensagem: `Contrato enviado para ${data.email} com sucesso.`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/modelos/:id/enviar]", err);
    return NextResponse.json({ erro: "Erro ao enviar contrato." }, { status: 500 });
  }
}
