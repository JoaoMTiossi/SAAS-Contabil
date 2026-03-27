export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PrintButton } from "./PrintButton";

async function getContrato(id: string) {
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      parcelas: { orderBy: { numero: "asc" } },
      obrigacoes: { orderBy: { prazo: "asc" } },
    },
  });
  if (!contrato) notFound();
  return contrato;
}

export default async function ImprimirContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getContrato(id);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      {/* Botões de ação - não aparecem na impressão */}
      <div className="no-print mb-6 flex gap-3 print:hidden">
        <PrintButton />
        <a
          href={`/contratos/${id}`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Voltar ao Contrato
        </a>
      </div>

      {/* Conteúdo do contrato para impressão */}
      <div className="print-container mx-auto max-w-3xl bg-white p-8 font-sans text-gray-900">
        {/* Cabeçalho */}
        <div className="mb-8 border-b border-gray-300 pb-6 text-center">
          <h1 className="text-2xl font-bold">CONTRATO</h1>
          {c.identificador && (
            <p className="mt-1 text-sm text-gray-500">Nº {c.identificador}</p>
          )}
        </div>

        {/* Partes */}
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-700 border-b pb-1">
            Partes Contratantes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-medium text-gray-500">Contratante</p>
              <p className="mt-0.5">{c.contratante ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Contratado</p>
              <p className="mt-0.5">{c.contratado ?? "—"}</p>
            </div>
          </div>
        </section>

        {/* Vigência */}
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-700 border-b pb-1">
            Vigência
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-medium text-gray-500">Início</p>
              <p className="mt-0.5">{c.dataInicio ? format(c.dataInicio, "dd/MM/yyyy") : "—"}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Término</p>
              <p className="mt-0.5">{c.dataFim ? format(c.dataFim, "dd/MM/yyyy") : "—"}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Renovação Automática</p>
              <p className="mt-0.5">
                {c.renovacaoAutomatica === null ? "—" : c.renovacaoAutomatica ? "Sim" : "Não"}
              </p>
            </div>
          </div>
          {c.prazoAvisoCancelamento && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-gray-500">Prazo Aviso de Cancelamento</p>
              <p className="mt-0.5">{format(c.prazoAvisoCancelamento, "dd/MM/yyyy")}</p>
            </div>
          )}
        </section>

        {/* Parcelas */}
        {c.parcelas.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-700 border-b pb-1">
              Parcelas / Pagamentos
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="py-2 px-3 text-left">Nº</th>
                  <th className="py-2 px-3 text-left">Descrição</th>
                  <th className="py-2 px-3 text-right">Valor</th>
                  <th className="py-2 px-3 text-left">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {c.parcelas.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 px-3">{p.numero}</td>
                    <td className="py-2 px-3">{p.descricao ?? "—"}</td>
                    <td className="py-2 px-3 text-right">
                      {p.valor
                        ? `R$ ${Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                    <td className="py-2 px-3">
                      {p.vencimento ? format(p.vencimento, "dd/MM/yyyy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Obrigações */}
        {c.obrigacoes.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-700 border-b pb-1">
              Obrigações
            </h2>
            <div className="space-y-3">
              {c.obrigacoes.map((o) => (
                <div key={o.id} className="rounded border border-gray-200 p-3 text-sm">
                  <p>{o.descricao}</p>
                  <div className="mt-1 flex gap-4 text-xs text-gray-500">
                    {o.responsavel && <span>Responsável: {o.responsavel}</span>}
                    {o.prazo && <span>Prazo: {format(o.prazo, "dd/MM/yyyy")}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assinaturas */}
        <section className="mt-12">
          <h2 className="mb-6 text-base font-semibold uppercase tracking-wide text-gray-700 border-b pb-1">
            Assinaturas
          </h2>
          <div className="grid gap-12 sm:grid-cols-2 text-sm text-center">
            <div>
              <div className="mb-2 border-t border-gray-400 pt-2">
                <p className="font-medium">{c.contratante ?? "Contratante"}</p>
              </div>
            </div>
            <div>
              <div className="mb-2 border-t border-gray-400 pt-2">
                <p className="font-medium">{c.contratado ?? "Contratado"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Rodapé */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
        </div>
      </div>

    </>
  );
}
