"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";

/* ── Types ─────────────────────────────────────────────────── */

interface RelatorioMensal {
  competencia: string;
  totalPrevisto: number;
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  inadimplencia: number;
}

interface AgingRow {
  faixa: string;
  quantidade: number;
  valorTotal: number;
}

/* ── Helpers ───────────────────────────────────────────────── */

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* ── Component ─────────────────────────────────────────────── */

export default function RelatoriosPage() {
  const { escritorioId } = useAuth();
  const [tipo, setTipo] = useState<"mensal" | "aging">("mensal");
  const [competencia, setCompetencia] = useState(getCurrentMonth);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [mensal, setMensal] = useState<RelatorioMensal | null>(null);
  const [aging, setAging] = useState<AgingRow[]>([]);

  const fetchRelatorio = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams({
        escritorioId,
        tipo,
        competencia,
      });
      const res = await fetch(`/api/honorarios/relatorios?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      const data = await res.json();

      if (data.tipo === "mensal") {
        setMensal(data.dados);
      } else {
        setAging(data.dados ?? []);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [tipo, competencia, escritorioId]);

  useEffect(() => {
    fetchRelatorio();
  }, [fetchRelatorio]);

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios de Honorários</h1>
        <Link
          href="/honorarios"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Voltar
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Toggle */}
        <div className="inline-flex rounded-lg border border-gray-200">
          <button
            onClick={() => setTipo("mensal")}
            className={`rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${
              tipo === "mensal"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Relatório Mensal
          </button>
          <button
            onClick={() => setTipo("aging")}
            className={`rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${
              tipo === "aging"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Aging
          </button>
        </div>

        {/* Month selector (only for mensal) */}
        {tipo === "mensal" && (
          <div>
            <label className="mr-2 text-sm text-gray-600">Competência:</label>
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      {/* Error */}
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Carregando...
        </div>
      ) : tipo === "mensal" ? (
        /* ── Relatório Mensal ──────────────────────────────────── */
        mensal ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Total Previsto</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatBRL(mensal.totalPrevisto)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Recebido</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {formatBRL(mensal.totalRecebido)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Pendente</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {formatBRL(mensal.totalPendente)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Atrasado</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {formatBRL(mensal.totalAtrasado)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">% Inadimplência</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {mensal.inadimplencia.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Visual bar */}
            {mensal.totalPrevisto > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Composição — {mensal.competencia}
                </p>
                <div className="flex h-4 overflow-hidden rounded-full bg-gray-100">
                  {mensal.totalRecebido > 0 && (
                    <div
                      className="bg-green-500 transition-all"
                      style={{
                        width: `${(mensal.totalRecebido / mensal.totalPrevisto) * 100}%`,
                      }}
                      title={`Recebido: ${formatBRL(mensal.totalRecebido)}`}
                    />
                  )}
                  {mensal.totalPendente > 0 && (
                    <div
                      className="bg-yellow-400 transition-all"
                      style={{
                        width: `${(mensal.totalPendente / mensal.totalPrevisto) * 100}%`,
                      }}
                      title={`Pendente: ${formatBRL(mensal.totalPendente)}`}
                    />
                  )}
                  {mensal.totalAtrasado > 0 && (
                    <div
                      className="bg-red-500 transition-all"
                      style={{
                        width: `${(mensal.totalAtrasado / mensal.totalPrevisto) * 100}%`,
                      }}
                      title={`Atrasado: ${formatBRL(mensal.totalAtrasado)}`}
                    />
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Recebido
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> Pendente
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Atrasado
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            Nenhum dado encontrado para esta competência.
          </div>
        )
      ) : (
        /* ── Relatório Aging ───────────────────────────────────── */
        aging.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            Nenhum lançamento atrasado encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Faixa</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Quantidade</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {aging.map((row) => (
                    <tr key={row.faixa} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.faixa}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{row.quantidade}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatBRL(row.valorTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {aging.reduce((s, r) => s + r.quantidade, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatBRL(aging.reduce((s, r) => s + r.valorTotal, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Visual breakdown by faixa */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-medium text-gray-700">Distribuição por Faixa</p>
              <div className="space-y-3">
                {aging.map((row) => {
                  const maxVal = Math.max(...aging.map((r) => r.valorTotal), 1);
                  const pct = (row.valorTotal / maxVal) * 100;
                  return (
                    <div key={row.faixa}>
                      <div className="mb-1 flex justify-between text-xs text-gray-600">
                        <span>{row.faixa}</span>
                        <span>{formatBRL(row.valorTotal)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100">
                        <div
                          className="h-3 rounded-full bg-red-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
