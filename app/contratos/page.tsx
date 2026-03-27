export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

type Status = "ativo" | "encerrado" | "renovado" | "cancelado";

const STATUS_CONFIG: Record<Status, string> = {
  ativo: "bg-green-100 text-green-700",
  encerrado: "bg-gray-100 text-gray-600",
  renovado: "bg-blue-100 text-blue-700",
  cancelado: "bg-red-100 text-red-700",
};

type ContratoLista = Awaited<ReturnType<typeof getContratos>>[number];

async function getContratos(escritorioId: string, status?: string) {
  const clienteIds = (
    await prisma.cliente.findMany({
      where: { escritorioId },
      select: { id: true },
    })
  ).map((c) => c.id);

  const where: Record<string, unknown> = {};
  // Show contracts belonging to escritorio's clients OR contracts without a client
  if (clienteIds.length > 0) {
    where.OR = [
      { clienteId: { in: clienteIds } },
      { clienteId: null },
    ];
  }
  if (status) where.status = status;

  return prisma.contrato.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { parcelas: true, obrigacoes: true, alertas: true } },
    },
  });
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pagina?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { status, pagina: paginaParam } = await searchParams;
  const contratos = await getContratos(session.user.escritorioId, status);
  const porPagina = 15;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const totalPaginas = Math.ceil(contratos.length / porPagina);
  const contratosPaginados = contratos.slice((pagina - 1) * porPagina, pagina * porPagina);

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
            Cadastrar primeiro contrato
          </Link>
        </div>
      ) : (
        <>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Identificador</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Partes</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Início</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Término</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Parcelas</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Alertas</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contratosPaginados.map((c: ContratoLista) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.identificador ?? <span className="text-gray-400 italic">Sem ID</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{c.contratante ?? "\u2014"}</div>
                    <div className="text-xs text-gray-400">{c.contratado ?? "\u2014"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.dataInicio ? format(c.dataInicio, "dd/MM/yyyy") : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.dataFim ? format(c.dataFim, "dd/MM/yyyy") : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.parcelas}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.alertas}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[c.status as Status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/contratos/${c.id}`} className="text-blue-600 hover:underline text-xs">
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {pagina > 1 && (
              <Link
                href={`/contratos?${status ? `status=${status}&` : ""}pagina=${pagina - 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/contratos?${status ? `status=${status}&` : ""}pagina=${p}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  p === pagina
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </Link>
            ))}
            {pagina < totalPaginas && (
              <Link
                href={`/contratos?${status ? `status=${status}&` : ""}pagina=${pagina + 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Próximo
              </Link>
            )}
          </div>
        )}
        </>
      )}
    </div>
  );
}
