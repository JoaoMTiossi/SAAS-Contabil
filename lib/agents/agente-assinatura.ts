/**
 * Agente Assinatura de Contratos
 * Assinatura eletrônica simples (Lei 14.063/2020).
 * Fluxo: Enviar → Link único → Aceite com IP/timestamp → Certificado.
 */

import { prisma } from "@/lib/prisma";
import { enviarNotificacao } from "@/lib/notificacoes/engine";
import { enviarEmail } from "@/lib/notificacoes/email";
import { registrarEvento } from "./agente-gestao-contratos";

// ─── Criar pedidos de assinatura ─────────────────────────────────

export interface CriarAssinaturaInput {
  contratoId: string;
  signatarios: Array<{
    nome: string;
    email: string;
    papel: string; // contratante | contratado | testemunha
  }>;
}

export async function criarPedidosAssinatura(input: CriarAssinaturaInput) {
  const assinaturas = await Promise.all(
    input.signatarios.map((s) =>
      prisma.assinatura.create({
        data: {
          contratoId: input.contratoId,
          nome: s.nome,
          email: s.email,
          papel: s.papel,
        },
      })
    )
  );

  // Enviar email para cada signatário
  for (const assinatura of assinaturas) {
    await enviarEmail({
      para: assinatura.email,
      assunto: "Você tem um contrato para assinar",
      corpo: `Olá ${assinatura.nome},\n\nVocê recebeu um contrato para assinar.\n\nAcesse o link para visualizar e assinar: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/assinatura/${assinatura.token}\n\nEste link é único e intransferível.`,
    });
  }

  await registrarEvento(
    input.contratoId,
    "assinatura_enviada",
    `Pedido de assinatura enviado para ${assinaturas.length} signatário(s)`
  );

  return assinaturas;
}

// ─── Visualizar contrato (marca como visualizado) ────────────────

export async function visualizarAssinatura(token: string) {
  const assinatura = await prisma.assinatura.findUnique({
    where: { token },
    include: {
      contrato: {
        select: {
          id: true,
          identificador: true,
          contratante: true,
          contratado: true,
          textoOriginal: true,
        },
      },
    },
  });

  if (!assinatura) throw new Error("Link de assinatura inválido.");
  if (assinatura.status === "expirado") throw new Error("Link expirado.");
  if (assinatura.status === "assinado") throw new Error("Contrato já assinado.");

  // Marcar como visualizado (se ainda pendente)
  if (assinatura.status === "pendente") {
    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: { status: "visualizado" },
    });
  }

  return assinatura;
}

// ─── Assinar contrato ────────────────────────────────────────────

export interface AssinarInput {
  token: string;
  ip: string;
  userAgent: string;
}

export async function assinarContrato(input: AssinarInput) {
  const assinatura = await prisma.assinatura.findUnique({
    where: { token: input.token },
    include: { contrato: true },
  });

  if (!assinatura) throw new Error("Link de assinatura inválido.");
  if (assinatura.status === "assinado") throw new Error("Contrato já assinado.");
  if (assinatura.status === "expirado") throw new Error("Link expirado.");

  const assinaturaAtualizada = await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: {
      status: "assinado",
      assinadoEm: new Date(),
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });

  // Registrar evento na timeline
  await registrarEvento(
    assinatura.contratoId,
    "assinado",
    `${assinatura.nome} (${assinatura.papel}) assinou o contrato`
  );

  // Verificar se todos já assinaram
  const pendentes = await prisma.assinatura.count({
    where: {
      contratoId: assinatura.contratoId,
      status: { not: "assinado" },
    },
  });

  if (pendentes === 0) {
    await registrarEvento(
      assinatura.contratoId,
      "totalmente_assinado",
      "Todas as partes assinaram o contrato"
    );
  }

  return assinaturaAtualizada;
}

// ─── Status das assinaturas de um contrato ───────────────────────

export async function statusAssinaturas(contratoId: string) {
  return prisma.assinatura.findMany({
    where: { contratoId },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      status: true,
      assinadoEm: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Gerar certificado de assinatura ─────────────────────────────

export interface CertificadoAssinatura {
  contratoId: string;
  identificador: string | null;
  assinaturas: Array<{
    nome: string;
    email: string;
    papel: string;
    assinadoEm: Date | null;
    ip: string | null;
  }>;
  geradoEm: Date;
  hash: string;
}

export async function gerarCertificado(
  contratoId: string
): Promise<CertificadoAssinatura> {
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: {
      assinaturas: {
        where: { status: "assinado" },
        orderBy: { assinadoEm: "asc" },
      },
    },
  });

  if (!contrato) throw new Error("Contrato não encontrado.");

  // Hash simples para validação (em produção, usar algo mais robusto)
  const dados = JSON.stringify({
    id: contrato.id,
    assinaturas: contrato.assinaturas.map((a) => ({
      nome: a.nome,
      assinadoEm: a.assinadoEm,
      ip: a.ip,
    })),
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(dados);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    contratoId: contrato.id,
    identificador: contrato.identificador,
    assinaturas: contrato.assinaturas.map((a) => ({
      nome: a.nome,
      email: a.email,
      papel: a.papel,
      assinadoEm: a.assinadoEm,
      ip: a.ip,
    })),
    geradoEm: new Date(),
    hash,
  };
}
