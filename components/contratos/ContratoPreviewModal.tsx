"use client";

import { useEffect, useState } from "react";

interface Assinatura {
  nome: string;
  email: string;
  papel: string;
  status: string;
  assinadoEm: string | null;
}

interface ContratoDetalhe {
  id: string;
  identificador: string | null;
  contratante: string | null;
  contratado: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  status: string;
  textoOriginal: string | null;
  assinaturas: Assinatura[];
}

function formatDate(iso: string): string {
  const normalized = iso.length === 10 ? `${iso}T12:00:00` : iso;
  const d = new Date(normalized);
  return d.toLocaleDateString("pt-BR");
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  visualizado: "bg-blue-100 text-blue-700",
  assinado: "bg-green-100 text-green-700",
  expirado: "bg-red-100 text-red-700",
};

export default function ContratoPreviewModal({
  contratoId,
  onClose,
}: {
  contratoId: string;
  onClose: () => void;
}) {
  const [contrato, setContrato] = useState<ContratoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contratos/${contratoId}`);
        if (!res.ok) throw new Error("Erro ao carregar contrato");
        const data = await res.json();
        setContrato(data);
      } catch {
        setErro("Não foi possível carregar o contrato.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contratoId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {loading ? "Carregando..." : contrato?.identificador ?? "Contrato"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        )}

        {erro && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {contrato && (
          <>
            {/* Metadata */}
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Contratante:</span>{" "}
                <span className="text-gray-600">{contrato.contratante ?? "\u2014"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Contratado:</span>{" "}
                <span className="text-gray-600">{contrato.contratado ?? "\u2014"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">In\u00edcio:</span>{" "}
                <span className="text-gray-600">{contrato.dataInicio ? formatDate(contrato.dataInicio) : "\u2014"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">T\u00e9rmino:</span>{" "}
                <span className="text-gray-600">{contrato.dataFim ? formatDate(contrato.dataFim) : "\u2014"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>{" "}
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium">{contrato.status}</span>
              </div>
            </div>

            {/* Contract text */}
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Texto do Contrato</h3>
              {contrato.textoOriginal ? (
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {contrato.textoOriginal}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                  Texto do contrato n\u00e3o dispon\u00edvel.
                </div>
              )}
            </div>

            {/* Signatures */}
            {contrato.assinaturas && contrato.assinaturas.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700">Assinaturas</h3>
                <div className="space-y-2">
                  {contrato.assinaturas.map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-800">{a.nome}</span>
                        <span className="ml-2 text-xs text-gray-400">{a.email}</span>
                        <span className="ml-2 text-xs text-gray-400">({a.papel})</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {a.status}
                        {a.assinadoEm && ` - ${formatDate(a.assinadoEm)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
