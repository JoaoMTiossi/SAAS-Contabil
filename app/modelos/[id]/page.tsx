export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ModeloDetalhe } from "./ModeloDetalhe";

async function getModelo(id: string) {
  const modelo = await prisma.modeloContrato.findUnique({
    where: { id },
    include: {
      gerados: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!modelo) notFound();
  return modelo;
}

export default async function ModeloDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelo = await getModelo(id);

  return (
    <ModeloDetalhe
      modelo={{
        ...modelo,
        createdAt: modelo.createdAt.toISOString(),
        updatedAt: modelo.updatedAt.toISOString(),
        gerados: modelo.gerados.map((g) => ({
          ...g,
          dados: g.dados as Record<string, string>,
          createdAt: g.createdAt.toISOString(),
          updatedAt: g.updatedAt.toISOString(),
          dataEnvio: g.dataEnvio?.toISOString() ?? null,
        })),
      }}
    />
  );
}
