export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ExcluirModeloButton } from "./ExcluirModeloButton";

async function getModelos() {
  return prisma.modeloContrato.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { gerados: true } },
    },
  });
}

export default async function ModelosPage() {
  const modelos = await getModelos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos de Contrato</h1>
          <p className="text-sm text-gray-500">
            Crie modelos padronizados com campos variáveis {"{{variavel}}"} para gerar contratos.
          </p>
        </div>
        <Link
          href="/modelos/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Modelo
        </Link>
      </div>

      {modelos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500">Nenhum modelo cadastrado.</p>
          <Link href="/modelos/novo" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Criar primeiro modelo →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modelos.map((m) => (
            <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{m.nome}</h3>
                  {m.descricao && <p className="mt-1 text-xs text-gray-500">{m.descricao}</p>}
                </div>
                <ExcluirModeloButton id={m.id} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {m.variaveis.slice(0, 5).map((v) => (
                  <span key={v} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {`{{${v}}}`}
                  </span>
                ))}
                {m.variaveis.length > 5 && (
                  <span className="text-xs text-gray-400">+{m.variaveis.length - 5} mais</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>{m._count.gerados} contrato(s) gerado(s)</span>
                <span>{format(m.createdAt, "dd/MM/yyyy")}</span>
              </div>
              <Link
                href={`/modelos/${m.id}`}
                className="mt-3 block rounded-lg bg-blue-50 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Usar Modelo →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
