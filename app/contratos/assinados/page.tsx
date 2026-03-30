"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

interface Assinatura {
  nome: string;
  email: string;
  papel: string;
  status: string;
  assinadoEm: string | null;
}

interface ContratoAssinado {
  id: string;
  identificador: string | null;
  contratante: string | null;
  contratado: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  status: string;
  assinaturas: Assinatura[];
}

export default function ContratosAssinadosPage() {
  const { escritorioId, loading: authLoading } = useAuth();
  const [contratos, setContratos] = useState<ContratoAssinado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [baixandoCertificado, setBaixandoCertificado] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !escritorioId) return;

    async function fetchContratos() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/contratos/assinados?escritorioId=${encodeURIComponent(escritorioId)}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.erro || "Erro ao buscar contratos.");
        }
        const data = await res.json();
        setContratos(data.contratos);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro desconhecido.");
      } finally {
        setLoading(false);
      }
    }

    fetchContratos();
  }, [escritorioId, authLoading]);

  async function baixarCertificado(contratoId: string) {
    try {
      setBaixandoCertificado(contratoId);
      const res = await fetch(`/api/contratos/${contratoId}/certificado`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.erro || "Erro ao gerar certificado.");
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.certificado, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${contratoId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao baixar certificado.");
    } finally {
      setBaixandoCertificado(null);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "\u2014";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR");
  }

  function getDataAssinatura(assinaturas: Assinatura[]): string {
    const datas = assinaturas
      .map((a) => a.assinadoEm)
      .filter((d): d is string => d !== null)
      .sort();
    return datas.length > 0 ? formatDate(datas[datas.length - 1]) : "\u2014";
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{erro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Contratos Assinados
        </h1>
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
          {contratos.length} contrato{contratos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {contratos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            Nenhum contrato totalmente assinado encontrado.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Identificador
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Contratante
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Contratado
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Data Assinatura
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Signatarios
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Certificado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contratos.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.identificador ?? (
                      <span className="italic text-gray-400">Sem ID</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.contratante ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.contratado ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getDataAssinatura(c.assinaturas)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.assinaturas.map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                          title={`${a.email} - ${a.papel}`}
                        >
                          {a.nome}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => baixarCertificado(c.id)}
                      disabled={baixandoCertificado === c.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {baixandoCertificado === c.id ? (
                        <>
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          Gerando...
                        </>
                      ) : (
                        "Baixar Certificado"
                      )}
                    </button>
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
