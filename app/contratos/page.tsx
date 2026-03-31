export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ContratosTable } from "@/components/contratos/ContratosTable";

type Status = "ativo" | "encerrado" | "renovado" | "cancelado";

async function getContratos(status?: string) {
  return prisma.contrato.findMany({
    where: status ? { status: status as Status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { parcelas: true, obrigacoes: true, alertas: true } },
    },
  });
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const contratos = await getContratos(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        <Link
          href="/contratos/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Contrato
        </Link>
      </div>

      {/* Filtros por status */}
      <div className="flex gap-2 flex-wrap">
        {([undefined, "ativo", "encerrado", "renovado", "cancelado"] as const).map((s) => (
          <Link
            key={s ?? "todos"}
            href={s ? `/contratos?status=${s}` : "/contratos"}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors
              ${(!status && !s) || status === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
          >
            {s ?? "Todos"}
          </Link>
        ))}
      </div>

      {contratos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500">Nenhum contrato encontrado.</p>
          <Link href="/contratos/novo" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Cadastrar primeiro contrato →
          </Link>
        </div>
      ) : (
        <ContratosTable contratos={contratos} />
      )}
    </div>
  );
}
