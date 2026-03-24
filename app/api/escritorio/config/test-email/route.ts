import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificacoes/email";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { escritorioId } = await req.json();
    if (!escritorioId) {
      return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
    }

    const escritorio = await prisma.escritorio.findUnique({
      where: { id: escritorioId },
      include: { config: true },
    });

    if (!escritorio?.config?.smtpHost) {
      return NextResponse.json({ erro: "SMTP não configurado. Salve as configurações primeiro." }, { status: 400 });
    }

    const enviado = await enviarEmail({
      para: escritorio.config.smtpUser ?? escritorio.email,
      assunto: "Teste SMTP - SAAS-Contabil",
      corpo: `Este é um email de teste do SAAS-Contabil.\n\nEscritório: ${escritorio.nome}\nData: ${new Date().toLocaleString("pt-BR")}`,
      escritorioId,
    });

    if (!enviado) {
      return NextResponse.json({ erro: "Falha ao enviar email. Verifique as configurações SMTP." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/escritorio/config/test-email]", err);
    return NextResponse.json({ erro: "Erro ao enviar email de teste." }, { status: 500 });
  }
}
