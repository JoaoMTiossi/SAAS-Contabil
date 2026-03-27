/**
 * POST /api/templates-contrato/[id]/enviar — enviar contrato gerado para assinatura via email
 * Expects: contratoId, signatarios [{nome, email, papel}]
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { enviarEmail } from "@/lib/notificacoes/email";

const SignatarioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  papel: z.string().min(1, "Papel é obrigatório."),
});

const EnviarSchema = z.object({
  contratoId: z.string().min(1),
  signatarios: z.array(SignatarioSchema).min(1, "Pelo menos um signatário é obrigatório."),
  mensagem: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  await params; // consume params (template id used for reference)

  try {
    const body = await req.json();
    const data = EnviarSchema.parse(body);

    // Verify contract exists
    const contrato = await prisma.contrato.findUnique({
      where: { id: data.contratoId },
    });
    if (!contrato) {
      return NextResponse.json({ erro: "Contrato não encontrado." }, { status: 404 });
    }

    // Create signatures for each signatario
    const assinaturas = await Promise.all(
      data.signatarios.map((s: { nome: string; email: string; papel: string }) =>
        prisma.assinatura.create({
          data: {
            contratoId: data.contratoId,
            nome: s.nome,
            email: s.email,
            papel: s.papel,
            status: "pendente",
          },
        })
      )
    );

    // Send emails to each signatario
    const resultados: Array<{ email: string; enviado: boolean; erro?: string }> = [];

    for (const assinatura of assinaturas) {
      try {
        const linkAssinatura = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/assinar/${assinatura.token}`;
        const mensagemHtml = `
          <h2>Solicitação de Assinatura de Contrato</h2>
          <p>Olá <strong>${assinatura.nome}</strong>,</p>
          <p>Você foi convidado(a) para assinar o contrato <strong>${contrato.identificador || contrato.id}</strong> como <strong>${assinatura.papel}</strong>.</p>
          ${data.mensagem ? `<p>${data.mensagem}</p>` : ""}
          <p>Clique no link abaixo para visualizar e assinar o contrato:</p>
          <p><a href="${linkAssinatura}" style="background-color:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">Assinar Contrato</a></p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">Este link é pessoal e intransferível. Caso não reconheça esta solicitação, ignore este e-mail.</p>
        `;

        await enviarEmail({
          escritorioId: session.user.escritorioId,
          para: assinatura.email,
          assunto: `Assinatura de Contrato - ${contrato.identificador || "Contrato"}`,
          corpo: `Assinatura de contrato solicitada para ${assinatura.nome}`,
          html: mensagemHtml,
        });

        resultados.push({ email: assinatura.email, enviado: true });
      } catch (emailErr) {
        console.error(`Erro ao enviar email para ${assinatura.email}:`, emailErr);
        resultados.push({
          email: assinatura.email,
          enviado: false,
          erro: emailErr instanceof Error ? emailErr.message : "Erro desconhecido",
        });
      }
    }

    // Create event
    await prisma.contratoEvento.create({
      data: {
        contratoId: data.contratoId,
        tipo: "envio_assinatura",
        descricao: `Enviado para assinatura: ${data.signatarios.map((s: { nome: string; email: string; papel: string }) => s.nome).join(", ")}`,
      },
    });

    return NextResponse.json({
      ok: true,
      assinaturas: assinaturas.map((a: { id: string; nome: string; email: string; status: string }) => ({ id: a.id, nome: a.nome, email: a.email, status: a.status })),
      resultados,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/templates-contrato/[id]/enviar]", err);
    return NextResponse.json({ erro: "Erro ao enviar para assinatura." }, { status: 500 });
  }
}
