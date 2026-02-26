export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { AlertaCard } from "@/components/alertas/AlertaCard";
import { TipoAlerta, PrioridadeAlerta } from "@/types/contrato";

type AlertaComContrato = Awaited<ReturnType<typeof getAlertas>>[number];

async function getAlertas(status?: string, prioridade?: string) {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (prioridade) where.prioridade = prioridade;

  return prisma.alerta.findMany({
    where,
    orderBy: { dataAlerta: "asc" },
    take: 100,
    include: {
      contrato: {
        select: { identificador: true, contratante: true, contratado: true },
      },
    },
  });
}

export default async function AlertasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; prioridade?: string }>;
}) {
  const { status, prioridade } = await searchParams;
  const alertas = await getAlertas(status, prioridade);

  const statusOptions = [
    { value: "", label: "Todos" },
    { value: "agendado", label: "Agendados" },
    { value: "enviado", label: "Enviados" },
    { value: "cancelado", label: "Cancelados" },
  ];

  const prioridadeOptions = [
    { value: "", label: "Todas" },
    { value: "critico", label: "🚨 Crítico" },
    { value: "urgente", label: "🔔 Urgente" },
    { value: "atencao", label: "⚠️ Atenção" },
    { value: "info", label: "ℹ️ Info" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Alertas</h1>
          <p className="text-sm text-gray-500">{alertas.length} alerta(s) encontrado(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Status:</label>
          <div className="flex gap-1">
            {statusOptions.map((opt) => (
              <a
                key={opt.value}
                href={`/alertas?status=${opt.value}${prioridade ? `&prioridade=${prioridade}` : ""}`}
                className={`rounded-full px-3 py-0.5 text-xs font-medium border transition-colors
                  ${(status ?? "") === opt.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
              >
                {opt.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Prioridade:</label>
          <div className="flex gap-1">
            {prioridadeOptions.map((opt) => (
              <a
                key={opt.value}
                href={`/alertas?${status ? `status=${status}&` : ""}prioridade=${opt.value}`}
                className={`rounded-full px-3 py-0.5 text-xs font-medium border transition-colors
                  ${(prioridade ?? "") === opt.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
              >
                {opt.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">
          Nenhum alerta encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-2">
          {alertas.map((a: AlertaComContrato) => (
            <AlertaCard
              key={a.id}
              id={a.id}
              refTipo={a.refTipo as TipoAlerta}
              refDescricao={a.refDescricao}
              dataAlerta={format(a.dataAlerta, "dd/MM/yyyy")}
              antecedenciaDias={a.antecedenciaDias}
              prioridade={a.prioridade as PrioridadeAlerta}
              canais={a.canais}
              status={a.status}
              contrato={a.contrato}
            />
          ))}
        </div>
      )}
    </div>
  );
}
