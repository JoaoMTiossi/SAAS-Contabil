export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

type Status = "ativo" | "encerrado" | "renovado" | "cancelado";

const STATUS_CONFIG: Record<Status, string> = {
  ativo: "bg-green-100 text-green-700",
  encerrado: "bg-gray-100 text-gray-600",
  renovado: "bg-blue-100 text-blue-700",
  cancelado: "bg-red-100 text-red-700",
};

type ContratoLista = Awaited<ReturnType<typeof getContratos>>[number];

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
        {[undefined, "ativo", "encerrado", "renovado", "cancelado"].map((s) => (
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Identificador</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Partes</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Término</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Parcelas</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Alertas</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contratos.map((c: ContratoLista) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.identificador ?? <span className="text-gray-400 italic">Sem ID</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{c.contratante ?? "—"}</div>
                    <div className="text-xs text-gray-400">{c.contratado ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.dataFim ? format(c.dataFim, "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {c._count.parcelas}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {c._count.alertas}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[c.status as Status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contratos/${c.id}`} className="text-blue-600 hover:underline text-xs">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
