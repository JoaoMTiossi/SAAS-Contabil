/**
 * Notificações in-app (dashboard)
 * Salva notificações no banco para exibir no sino/badge.
 */

import { prisma } from "@/lib/prisma";

export interface NotificacaoDashboardInput {
  escritorioId: string;
  titulo: string;
  mensagem: string;
  link?: string;
}

export async function enviarNotificacaoDashboard(
  input: NotificacaoDashboardInput
): Promise<void> {
  await prisma.notificacao.create({
    data: {
      escritorioId: input.escritorioId,
      titulo: input.titulo,
      mensagem: input.mensagem,
      canal: "dashboard",
      link: input.link ?? null,
    },
  });
}

export async function listarNotificacoes(
  escritorioId: string,
  apenasNaoLidas = false
) {
  return prisma.notificacao.findMany({
    where: {
      escritorioId,
      ...(apenasNaoLidas ? { lida: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function marcarComoLida(notificacaoId: string): Promise<void> {
  await prisma.notificacao.update({
    where: { id: notificacaoId },
    data: { lida: true },
  });
}

export async function contarNaoLidas(escritorioId: string): Promise<number> {
  return prisma.notificacao.count({
    where: { escritorioId, lida: false },
  });
}
