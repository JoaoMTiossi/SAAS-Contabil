"use client";

import { ContratoExtraido, NivelConfianca, ParcelaExtraida, ObrigacaoExtraida } from "@/types/contrato";
import { ConfiancaBadge } from "./ConfiancaBadge";
import { useState } from "react";

interface Props {
  dados: ContratoExtraido;
  onChange: (dados: ContratoExtraido) => void;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  alerta,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  alerta?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || "")}
        placeholder={placeholder ?? "Não encontrado"}
        className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
          ${alerta
            ? "border-yellow-300 bg-yellow-50 focus:ring-yellow-400"
            : "border-gray-200 focus:ring-blue-400"
          }`}
      />
    </div>
  );
}

export function ExtractionReview({ dados, onChange }: Props) {
  const conf = dados.confianca;
  const needsReview = (nivel: NivelConfianca) => nivel !== "alta";

  // ── Vencimento Geral ──────────────────────────────────────────────
  function updateVencimento(field: string, value: string | boolean | null) {
    onChange({
      ...dados,
      vencimento_geral: { ...dados.vencimento_geral, [field]: value },
    });
  }

  // ── Parcela ───────────────────────────────────────────────────────
  function updateParcela(idx: number, field: keyof ParcelaExtraida, value: string | null) {
    const parcelas = [...dados.parcelas];
    parcelas[idx] = { ...parcelas[idx], [field]: value };
    onChange({ ...dados, parcelas });
  }

  function addParcela() {
    onChange({
      ...dados,
      parcelas: [
        ...dados.parcelas,
        {
          numero: dados.parcelas.length + 1,
          descricao: null,
          valor: null,
          vencimento: null,
          status: "pendente",
        },
      ],
    });
  }

  function removeParcela(idx: number) {
    const parcelas = dados.parcelas.filter((_, i) => i !== idx);
    onChange({ ...dados, parcelas });
  }

  // ── Obrigação ─────────────────────────────────────────────────────
  function updateObrigacao(idx: number, field: keyof ObrigacaoExtraida, value: string | null) {
    const obrigacoes = [...dados.obrigacoes];
    obrigacoes[idx] = { ...obrigacoes[idx], [field]: value } as ObrigacaoExtraida;
    onChange({ ...dados, obrigacoes });
  }

  function addObrigacao() {
    onChange({
      ...dados,
      obrigacoes: [
        ...dados.obrigacoes,
        { descricao: "", responsavel: null, prazo: null, status: "pendente" },
      ],
    });
  }

  function removeObrigacao(idx: number) {
    const obrigacoes = dados.obrigacoes.filter((_, i) => i !== idx);
    onChange({ ...dados, obrigacoes });
  }

  return (
    <div className="space-y-6">
      {/* ── Identificação ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-800">Identificação do Contrato</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <InputField
            label="Identificador / Número"
            value={dados.contrato.identificador}
            onChange={(v) => onChange({ ...dados, contrato: { ...dados.contrato, identificador: v || null } })}
          />
          <InputField
            label="Contratante"
            value={dados.contrato.partes.contratante}
            onChange={(v) =>
              onChange({ ...dados, contrato: { ...dados.contrato, partes: { ...dados.contrato.partes, contratante: v || null } } })
            }
          />
          <InputField
            label="Contratado"
            value={dados.contrato.partes.contratado}
            onChange={(v) =>
              onChange({ ...dados, contrato: { ...dados.contrato, partes: { ...dados.contrato.partes, contratado: v || null } } })
            }
          />
        </div>
      </section>

      {/* ── Vencimento Geral ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">Vencimento Geral</h3>
          <ConfiancaBadge nivel={conf.vencimento_geral} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label="Data de Início"
            value={dados.vencimento_geral.data_inicio}
            onChange={(v) => updateVencimento("data_inicio", v || null)}
            placeholder="DD/MM/AAAA"
            alerta={needsReview(conf.vencimento_geral)}
          />
          <InputField
            label="Data de Término"
            value={dados.vencimento_geral.data_fim}
            onChange={(v) => updateVencimento("data_fim", v || null)}
            placeholder="DD/MM/AAAA"
            alerta={needsReview(conf.vencimento_geral)}
          />
          <InputField
            label="Prazo Limite para Aviso de Não Renovação"
            value={dados.vencimento_geral.prazo_aviso_cancelamento}
            onChange={(v) => updateVencimento("prazo_aviso_cancelamento", v || null)}
            placeholder="DD/MM/AAAA"
            alerta={needsReview(conf.vencimento_geral)}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Renovação Automática</label>
            <select
              value={
                dados.vencimento_geral.renovacao_automatica === null
                  ? ""
                  : dados.vencimento_geral.renovacao_automatica
                  ? "sim"
                  : "nao"
              }
              onChange={(e) =>
                updateVencimento(
                  "renovacao_automatica",
                  e.target.value === "" ? null : e.target.value === "sim"
                )
              }
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Não identificado</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Parcelas ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">
              Parcelas ({dados.parcelas.length})
            </h3>
            <ConfiancaBadge nivel={conf.parcelas} />
          </div>
          <button
            onClick={addParcela}
            className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-3">
          {dados.parcelas.length === 0 && (
            <p className="text-sm text-gray-400">Nenhuma parcela identificada.</p>
          )}
          {dados.parcelas.map((p, idx) => (
            <div key={idx} className="grid gap-2 rounded border border-gray-100 bg-gray-50 p-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Nº</label>
                <input
                  type="number"
                  value={p.numero}
                  readOnly
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                />
              </div>
              <InputField
                label="Descrição"
                value={p.descricao}
                onChange={(v) => updateParcela(idx, "descricao", v || null)}
                alerta={needsReview(conf.parcelas)}
              />
              <InputField
                label="Valor"
                value={p.valor}
                onChange={(v) => updateParcela(idx, "valor", v || null)}
                placeholder="R$ 0,00"
                alerta={needsReview(conf.parcelas)}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputField
                    label="Vencimento"
                    value={p.vencimento}
                    onChange={(v) => updateParcela(idx, "vencimento", v || null)}
                    placeholder="DD/MM/AAAA"
                    alerta={!p.vencimento}
                  />
                </div>
                <button
                  onClick={() => removeParcela(idx)}
                  className="mt-5 rounded p-1 text-red-400 hover:text-red-600"
                  title="Remover parcela"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Obrigações ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">
              Obrigações ({dados.obrigacoes.length})
            </h3>
            <ConfiancaBadge nivel={conf.obrigacoes} />
          </div>
          <button
            onClick={addObrigacao}
            className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-3">
          {dados.obrigacoes.length === 0 && (
            <p className="text-sm text-gray-400">Nenhuma obrigação identificada.</p>
          )}
          {dados.obrigacoes.map((o, idx) => (
            <div key={idx} className="grid gap-2 rounded border border-gray-100 bg-gray-50 p-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-gray-500">Descrição</label>
                <textarea
                  rows={2}
                  value={o.descricao}
                  onChange={(e) => updateObrigacao(idx, "descricao", e.target.value)}
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Responsável</label>
                <select
                  value={o.responsavel ?? ""}
                  onChange={(e) =>
                    updateObrigacao(idx, "responsavel", e.target.value || null)
                  }
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                >
                  <option value="">Não identificado</option>
                  <option value="contratante">Contratante</option>
                  <option value="contratado">Contratado</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputField
                    label="Prazo"
                    value={o.prazo}
                    onChange={(v) => updateObrigacao(idx, "prazo", v || null)}
                    placeholder="DD/MM/AAAA"
                    alerta={!o.prazo}
                  />
                </div>
                <button
                  onClick={() => removeObrigacao(idx)}
                  className="mt-5 rounded p-1 text-red-400 hover:text-red-600"
                  title="Remover obrigação"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
