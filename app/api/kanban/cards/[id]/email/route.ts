/**
 * POST /api/kanban/cards/[id]/email — envia email relacionado ao card de rescisão
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { enviarEmail } from "@/lib/notificacoes/email";

const EmailPayloadSchema = z.object({
  destinatario: z.string().email("Email inválido"),
  assunto: z.string().min(1, "Assunto é obrigatório"),
  corpo: z.string().min(1, "Corpo é obrigatório"),
  escritorioId: z.string().min(1, "escritorioId é obrigatório"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = EmailPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { destinatario, assunto, corpo, escritorioId } = parsed.data;

    const enviado = await enviarEmail({
      para: destinatario,
      assunto,
      corpo,
      escritorioId,
    });

    if (!enviado) {
      return NextResponse.json(
        { erro: "SMTP não configurado ou falha no envio. Verifique as configurações de email do escritório." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `Email enviado com sucesso para ${destinatario}`,
      cardId: id,
    });
  } catch (err) {
    console.error(`[EMAIL ROUTE] Erro ao enviar email para card ${id}:`, err);
    return NextResponse.json(
      { erro: "Erro interno ao enviar email" },
      { status: 500 }
    );
  }
}
