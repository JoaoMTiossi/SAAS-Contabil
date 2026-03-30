/**
 * POST /api/honorarios/enviar-email
 * Envia email de cobrança de honorário.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { enviarEmail } from "@/lib/notificacoes/email";

const EnviarEmailSchema = z.object({
  destinatario: z.string().email("E-mail do destinatário inválido."),
  assunto: z.string().min(1, "Assunto é obrigatório."),
  corpo: z.string().min(1, "Corpo do e-mail é obrigatório."),
  escritorioId: z.string().min(1, "escritorioId é obrigatório."),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = EnviarEmailSchema.parse(body);

    const enviado = await enviarEmail({
      para: data.destinatario,
      assunto: data.assunto,
      corpo: data.corpo,
      escritorioId: data.escritorioId,
    });

    if (!enviado) {
      return NextResponse.json(
        { erro: "SMTP não configurado. E-mail não pôde ser enviado." },
        { status: 422 },
      );
    }

    return NextResponse.json({ mensagem: "E-mail enviado com sucesso." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: err.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/honorarios/enviar-email]", err);
    return NextResponse.json(
      { erro: "Erro ao enviar e-mail." },
      { status: 500 },
    );
  }
}
