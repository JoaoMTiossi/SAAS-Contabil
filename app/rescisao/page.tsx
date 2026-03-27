export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { KanbanRescisao } from "./KanbanRescisao";

async function getData() {
  const [rescisoes, contratos] = await Promise.all([
    prisma.rescisaoKanban.findMany({
      include: {
        contrato: {
          select: {
            id: true,
            identificador: true,
            contratante: true,
            contratado: true,
            dataFim: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contrato.findMany({
      where: {
        rescisao: null,
        status: { in: ["ativo", "encerrado"] },
      },
      select: {
        id: true,
        identificador: true,
        contratante: true,
        contratado: true,
        dataFim: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { rescisoes, contratos };
}

export default async function RescisaoPage() {
  const { rescisoes, contratos } = await getData();

  return (
    <KanbanRescisao
      rescisoes={rescisoes.map((r) => ({
        ...r,
        dataInicio: r.dataInicio.toISOString(),
        dataPrevisao: r.dataPrevisao?.toISOString() ?? null,
        contrato: {
          ...r.contrato,
          dataFim: r.contrato.dataFim?.toISOString() ?? null,
        },
      }))}
      contratosDisponiveis={contratos.map((c) => ({
        ...c,
        dataFim: c.dataFim?.toISOString() ?? null,
      }))}
    />
  );
}
