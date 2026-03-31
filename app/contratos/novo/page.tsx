"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadZone } from "@/components/upload/FileUploadZone";
import { ExtractionReview } from "@/components/contratos/ExtractionReview";
import { ContratoExtraido } from "@/types/contrato";

type Etapa = "upload" | "revisao" | "confirmando";

export default function NovoContratoPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [carregando, setCarregando] = useState(false);
  const [extraido, setExtraido] = useState<ContratoExtraido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [errosCampos, setErrosCampos] = useState<{ campo: string; mensagem: string }[]>([]);

  function handleExtraido(dados: unknown) {
    setExtraido(dados as ContratoExtraido);
    setEtapa("revisao");
  }

  async function confirmarESalvar() {
    if (!extraido) return;
    setEtapa("confirmando");
    setErro(null);
    setErrosCampos([]);

    try {
      const payload = {
        identificador: extraido.contrato.identificador,
        contratante: extraido.contrato.partes.contratante,
        contratado: extraido.contrato.partes.contratado,
        dataInicio: extraido.vencimento_geral.data_inicio,
        dataFim: extraido.vencimento_geral.data_fim,
        renovacaoAutomatica: extraido.vencimento_geral.renovacao_automatica,
        prazoAvisoCancelamento: extraido.vencimento_geral.prazo_aviso_cancelamento,
        confiancaVencimento: extraido.confianca.vencimento_geral,
        confiancaParcelas: extraido.confianca.parcelas,
        confiancaObrigacoes: extraido.confianca.obrigacoes,
        parcelas: extraido.parcelas,
        obrigacoes: extraido.obrigacoes,
      };

      const res = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        if (json.detalhes && Array.isArray(json.detalhes)) {
          setErrosCampos(
            json.detalhes.map((issue: { path: string[]; message: string }) => ({
              campo: issue.path?.join(".") ?? "campo",
              mensagem: issue.message,
            }))
          );
        }
        throw new Error(json.erro ?? "Erro ao salvar contrato.");
      }

      const contrato = await res.json();
      router.push(`/contratos/${contrato.id}`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      setEtapa("revisao");
    }
  }

  const etapas = [
    { id: "upload", label: "1. Upload", done: etapa !== "upload" },
    { id: "revisao", label: "2. Revisão", done: etapa === "confirmando" },
    { id: "confirmando", label: "3. Confirmação", done: false },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Contrato</h1>
        <p className="text-sm text-gray-500">
          Faça upload do contrato para extração automática de prazos.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {etapas.map((e, idx) => (
          <div key={e.id} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                ${e.done ? "bg-green-500 text-white" : etapa === e.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              {e.done ? "✓" : idx + 1}
            </div>
            <span className={`text-sm ${etapa === e.id ? "font-semibold text-gray-900" : "text-gray-400"}`}>
              {e.label}
            </span>
            {idx < etapas.length - 1 && (
              <div className="mx-2 h-px w-8 bg-gray-200" />
            )}
          </div>
        ))}
      </div>

      {/* Etapa 1: Upload */}
      {etapa === "upload" && (
        <FileUploadZone
          onTextoPuro={() => {}}
          onExtraido={handleExtraido}
          carregando={carregando}
          setCarregando={setCarregando}
        />
      )}

      {/* Etapa 2: Revisão */}
      {(etapa === "revisao" || etapa === "confirmando") && extraido && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <strong>Revise os dados extraídos.</strong> Campos com confiança Média (amarelo) ou Baixa
            (vermelho) foram inferidos e precisam de verificação antes de confirmar.
          </div>

          <ExtractionReview dados={extraido} onChange={setExtraido} />

          {(erro || errosCampos.length > 0) && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
              {erro && <p className="font-medium">{erro}</p>}
              {errosCampos.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5">
                  {errosCampos.map((e, i) => (
                    <li key={i}>
                      <strong>{e.campo}:</strong> {e.mensagem}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa("upload")}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Voltar
            </button>
            <button
              onClick={confirmarESalvar}
              disabled={etapa === "confirmando"}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {etapa === "confirmando" ? "Salvando..." : "Confirmar e Salvar →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
