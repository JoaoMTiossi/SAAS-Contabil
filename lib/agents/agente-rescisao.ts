/**
 * Agente Rescisão (Kanban)
 * Kanban com colunas customizáveis para gerenciar processos de rescisão contratual.
 */

import { prisma } from "@/lib/prisma";
import { registrarEvento } from "./agente-gestao-contratos";
import { cancelarAlertasContrato } from "@/lib/scheduler";

// ─── Board Setup ─────────────────────────────────────────────────

const COLUNAS_PADRAO = [
  { nome: "Solicitado", ordem: 0, cor: "#6B7280" },
  { nome: "Aviso Enviado", ordem: 1, cor: "#F59E0B" },
  { nome: "Distrato Gerado", ordem: 2, cor: "#3B82F6" },
  { nome: "Obrigações Pendentes", ordem: 3, cor: "#EF4444" },
  { nome: "Baixa Concluída", ordem: 4, cor: "#10B981" },
];

/**
 * Cria ou retorna o board de rescisões de um escritório.
 */
export async function obterOuCriarBoard(escritorioId: string) {
  let board = await prisma.kanbanBoard.findFirst({
    where: { escritorioId },
    include: {
      colunas: {
        orderBy: { ordem: "asc" },
        include: {
          cards: {
            orderBy: { ordem: "asc" },
            include: {
              contrato: {
                select: { identificador: true, contratante: true, contratado: true },
              },
              cliente: { select: { razaoSocial: true } },
              checklists: { orderBy: { ordem: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!board) {
    board = await prisma.kanbanBoard.create({
      data: {
        escritorioId,
        colunas: {
          create: COLUNAS_PADRAO,
        },
      },
      include: {
        colunas: {
          orderBy: { ordem: "asc" },
          include: {
            cards: {
              orderBy: { ordem: "asc" },
              include: {
                contrato: {
                  select: { identificador: true, contratante: true, contratado: true },
                },
                cliente: { select: { razaoSocial: true } },
                checklists: { orderBy: { ordem: "asc" } },
              },
            },
          },
        },
      },
    });
  }

  return board;
}

// ─── Gerenciar Colunas ───────────────────────────────────────────

export async function adicionarColuna(
  boardId: string,
  data: { nome: string; ordem: number; cor?: string }
) {
  return prisma.kanbanColuna.create({
    data: { boardId, nome: data.nome, ordem: data.ordem, cor: data.cor },
  });
}

export async function reordenarColunas(
  colunas: Array<{ id: string; ordem: number }>
) {
  await Promise.all(
    colunas.map((c) =>
      prisma.kanbanColuna.update({
        where: { id: c.id },
        data: { ordem: c.ordem },
      })
    )
  );
}

export async function removerColuna(colunaId: string) {
  // Verifica se tem cards
  const cards = await prisma.kanbanCard.count({ where: { colunaId } });
  if (cards > 0) {
    throw new Error("Não é possível remover coluna com cards. Mova-os primeiro.");
  }
  return prisma.kanbanColuna.delete({ where: { id: colunaId } });
}

// ─── Gerenciar Cards ─────────────────────────────────────────────

const CHECKLIST_PADRAO = [
  "Notificar cliente sobre rescisão",
  "Gerar documento de distrato",
  "Cancelar cobranças futuras",
  "Verificar obrigações acessórias pendentes",
  "Encerrar acesso do cliente ao sistema",
  "Arquivar documentos",
];

export async function criarCardRescisao(data: {
  escritorioId: string;
  contratoId: string;
  clienteId: string;
  motivo?: string;
  dataPrevisao?: Date;
}) {
  const board = await obterOuCriarBoard(data.escritorioId);
  const primeiraColuna = board.colunas[0];

  if (!primeiraColuna) {
    throw new Error("Board sem colunas. Configure o kanban primeiro.");
  }

  // Conta cards na coluna para definir ordem
  const totalCards = await prisma.kanbanCard.count({
    where: { colunaId: primeiraColuna.id },
  });

  const card = await prisma.kanbanCard.create({
    data: {
      colunaId: primeiraColuna.id,
      contratoId: data.contratoId,
      clienteId: data.clienteId,
      motivo: data.motivo,
      dataPrevisao: data.dataPrevisao,
      ordem: totalCards,
      checklists: {
        create: CHECKLIST_PADRAO.map((desc, i) => ({
          descricao: desc,
          ordem: i,
        })),
      },
    },
    include: {
      checklists: true,
    },
  });

  // Registrar evento no contrato
  await registrarEvento(
    data.contratoId,
    "rescisao_iniciada",
    `Processo de rescisão iniciado${data.motivo ? `: ${data.motivo}` : ""}`
  );

  return card;
}

export async function moverCard(cardId: string, novaColunaId: string, novaOrdem?: number) {
  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    include: { coluna: true },
  });

  if (!card) throw new Error("Card não encontrado.");

  const novaColuna = await prisma.kanbanColuna.findUnique({
    where: { id: novaColunaId },
  });

  if (!novaColuna) throw new Error("Coluna de destino não encontrada.");

  await prisma.kanbanCard.update({
    where: { id: cardId },
    data: { colunaId: novaColunaId, ordem: novaOrdem ?? 0 },
  });

  // Se moveu para a última coluna (Baixa Concluída), finalizar rescisão
  const todasColunas = await prisma.kanbanColuna.findMany({
    where: { boardId: novaColuna.boardId },
    orderBy: { ordem: "desc" },
    take: 1,
  });

  if (todasColunas[0]?.id === novaColunaId) {
    await finalizarRescisao(card.contratoId);
  }

  await registrarEvento(
    card.contratoId,
    "rescisao_movida",
    `Rescisão movida para "${novaColuna.nome}"`
  );
}

export async function atualizarChecklist(checklistId: string, feito: boolean) {
  return prisma.kanbanChecklist.update({
    where: { id: checklistId },
    data: { feito },
  });
}

// ─── Finalizar Rescisão ──────────────────────────────────────────

async function finalizarRescisao(contratoId: string) {
  // Atualizar status do contrato
  await prisma.contrato.update({
    where: { id: contratoId },
    data: { status: "cancelado" },
  });

  // Cancelar alertas futuros
  await cancelarAlertasContrato(contratoId);

  // Registrar evento
  await registrarEvento(
    contratoId,
    "rescisao_concluida",
    "Processo de rescisão concluído — contrato encerrado"
  );
}
