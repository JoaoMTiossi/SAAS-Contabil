export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { AlertaCard } from "@/components/alertas/AlertaCard";
import { ConfiancaBadge } from "@/components/contratos/ConfiancaBadge";
import { TipoAlerta, PrioridadeAlerta, NivelConfianca } from "@/types/contrato";
import { ParcelaActions } from "./ParcelaActions";
import { ObrigacaoActions } from "./ObrigacaoActions";
import { ContratoStatusActions } from "./ContratoStatusActions";

type ContratoDetalhado = Awaited<ReturnType<typeof getContrato>>;

async function getContrato(id: string) {
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      parcelas: { orderBy: { numero: "asc" } },
      obrigacoes: { orderBy: { prazo: "asc" } },
      alertas: { orderBy: { dataAlerta: "asc" } },
    },
  });
  if (!contrato) notFound();
  return contrato;
}

const STATUS_PARCELA_COR: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  pago: "bg-green-100 text-green-700",
  cancelado: "bg-gray-100 text-gray-500",
  atrasado: "bg-red-100 text-red-700",
};

const STATUS_OBRIGACAO_COR: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  entregue: "bg-green-100 text-green-700",
  cancelado: "bg-gray-100 text-gray-500",
  atrasado: "bg-red-100 text-red-700",
};

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contrato = await getContrato(id);

  type Alerta = ContratoDetalhado["alertas"][number];
  type Parcela = ContratoDetalhado["parcelas"][number];
  type Obrigacao = ContratoDetalhado["obrigacoes"][number];
  const alertasAtivos = contrato.alertas.filter((a: Alerta) => a.status === "agendado");

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {contrato.identificador ?? "Contrato sem identificador"}
          </h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
            {contrato.contratante && <span>Contratante: <strong>{contrato.contratante}</strong></span>}
            {contrato.contratado && <span>Contratado: <strong>{contrato.contratado}</strong></span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/contratos/${contrato.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Gerar PDF
          </a>
          <ContratoStatusActions id={contrato.id} status={contrato.status} />
        </div>
      </div>

      {/* Vencimento Geral */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">Vencimento Geral</h2>
          <ConfiancaBadge nivel={contrato.confiancaVencimento as NivelConfianca} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Início</p>
            <p className="font-medium">{contrato.dataInicio ? format(contrato.dataInicio, "dd/MM/yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Término</p>
            <p className="font-medium">{contrato.dataFim ? format(contrato.dataFim, "dd/MM/yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Renovação Automática</p>
            <p className="font-medium">
              {contrato.renovacaoAutomatica === null ? "—" : contrato.renovacaoAutomatica ? "Sim" : "Não"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Prazo Aviso Cancelamento</p>
            <p className="font-medium">
              {contrato.prazoAvisoCancelamento ? format(contrato.prazoAvisoCancelamento, "dd/MM/yyyy") : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Parcelas */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">
            Parcelas ({contrato.parcelas.length})
          </h2>
          <ConfiancaBadge nivel={contrato.confiancaParcelas as NivelConfianca} />
        </div>
        {contrato.parcelas.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma parcela cadastrada.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Nº</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Descrição</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Valor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Vencimento</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contrato.parcelas.map((p: Parcela) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{p.numero}</td>
                    <td className="px-3 py-2 text-gray-700">{p.descricao ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {p.valor ? `R$ ${Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {p.vencimento ? format(p.vencimento, "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PARCELA_COR[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <ParcelaActions
                        parcelaId={p.id}
                        contratoId={contrato.id}
                        statusAtual={p.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Obrigações */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">
            Obrigações ({contrato.obrigacoes.length})
          </h2>
          <ConfiancaBadge nivel={contrato.confiancaObrigacoes as NivelConfianca} />
        </div>
        {contrato.obrigacoes.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma obrigação cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {contrato.obrigacoes.map((o: Obrigacao) => (
              <div key={o.id} className="flex items-start gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{o.descricao}</p>
                  <div className="mt-1 flex gap-3 text-xs text-gray-500">
                    {o.responsavel && <span>Responsável: <strong>{o.responsavel}</strong></span>}
                    {o.prazo && <span>Prazo: <strong>{format(o.prazo, "dd/MM/yyyy")}</strong></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_OBRIGACAO_COR[o.status]}`}>
                    {o.status}
                  </span>
                  <ObrigacaoActions
                    obrigacaoId={o.id}
                    contratoId={contrato.id}
                    statusAtual={o.status}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alertas */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-800">
          Alertas ({alertasAtivos.length} ativos)
        </h2>
        {contrato.alertas.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum alerta gerado.</p>
        ) : (
          <div className="space-y-2">
            {contrato.alertas
              .filter((a: Alerta) => a.status !== "cancelado")
              .map((a: Alerta) => (
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
                />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
