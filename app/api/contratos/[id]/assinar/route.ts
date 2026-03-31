/**
 * POST /api/contratos/[id]/assinar
 * Registra a assinatura de um contrato
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const AssinarSchema = z.object({
  nome: z.string().min(1, "Nome do assinante é obrigatório"),
  cpf: z
    .string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .optional()
    .or(z.literal("")),
  papel: z.enum(["contratante", "contratado", "testemunha"], {
    errorMap: () => ({ message: "Papel inválido" }),
  }),
  ip: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const body = await req.json();
    const data = AssinarSchema.parse(body);

    const contrato = await prisma.contrato.findUnique({ where: { id } });
    if (!contrato) {
      return NextResponse.json({ erro: "Contrato não encontrado." }, { status: 404 });
    }

    // Registra assinatura no campo de metadados (JSON no textoOriginal seria invasivo;
    // aqui usamos um campo novo via update genérico).
    // Como o schema atual não tem tabela de assinaturas, registramos no próprio contrato
    // como uma anotação no textoOriginal com marcador especial.
    const timestamp = new Date().toISOString();
    const marcador = `\n\n--- ASSINATURA REGISTRADA ---\nNome: ${data.nome}\nPapel: ${data.papel}${data.cpf ? `\nCPF: ${data.cpf}` : ""}\nData/Hora: ${timestamp}\nIP: ${req.headers.get("x-forwarded-for") ?? "desconhecido"}\n--- FIM DA ASSINATURA ---`;

    await prisma.contrato.update({
      where: { id },
      data: {
        textoOriginal: (contrato.textoOriginal ?? "") + marcador,
      },
    });

    return NextResponse.json({
      mensagem: "Contrato assinado com sucesso.",
      assinatura: {
        nome: data.nome,
        papel: data.papel,
        timestamp,
      },
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const campos: Record<string, string> = {};
      for (const issue of (err as z.ZodError).issues) {
        const campo = String(issue.path[0] ?? "campo");
        campos[campo] = issue.message;
      }
      return NextResponse.json(
        { erro: "Dados inválidos", campos },
        { status: 400 }
      );
    }
    console.error("[POST /api/contratos/[id]/assinar]", err);
    return NextResponse.json({ erro: "Erro ao registrar assinatura." }, { status: 500 });
  }
}
