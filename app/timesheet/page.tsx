"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth";

interface RegistroTimesheet {
  id: string;
  clienteId: string;
  clienteNome?: string;
  categoria: "fiscal" | "contabil" | "dp" | "consultoria" | "administrativo";
  descricao: string;
  data: string;
  duracaoMinutos: number;
}

const categoriaBadge: Record<string, string> = {
  fiscal: "bg-blue-100 text-blue-700",
  contabil: "bg-purple-100 text-purple-700",
  dp: "bg-green-100 text-green-700",
  consultoria: "bg-orange-100 text-orange-700",
  administrativo: "bg-slate-100 text-slate-700",
};

function formatDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatData(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

export default function TimesheetPage() {
  const { escritorioId, usuarioId } = useAuth();
  const [periodo, setPeriodo] = useState<"semana" | "mes">("semana");
  const [registros, setRegistros] = useState<RegistroTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [clienteId, setClienteId] = useState("");
  const [categoria, setCategoria] = useState<string>("fiscal");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(60);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/timesheet?usuarioId=${usuarioId}&periodo=${periodo}`
      );
      if (res.ok) {
        const json = await res.json();
        setRegistros(json.data ?? json ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [periodo, usuarioId]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const totalMinutos = registros.reduce((s, r) => s + r.duracaoMinutos, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId,
          escritorioId,
          clienteId,
          categoria,
          descricao,
          data,
          duracaoMinutos,
        }),
      });
      if (res.ok) {
        setClienteId("");
        setDescricao("");
        setDuracaoMinutos(60);
        setShowForm(false);
        fetchRegistros();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Timesheet</h1>

          <div className="flex items-center gap-3">
            {/* Toggle Semana / Mês */}
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
              <button
                onClick={() => setPeriodo("semana")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  periodo === "semana"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setPeriodo("mes")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  periodo === "mes"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                M&ecirc;s
              </button>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {showForm ? "Cancelar" : "Registrar Horas"}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total horas {periodo === "semana" ? "da semana" : "do m\u00eas"}
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {formatDuracao(totalMinutos)}
          </p>
        </div>

        {/* Inline Form */}
        {showForm && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Registrar Horas
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Cliente */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    placeholder="ID do cliente"
                    required
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Categoria
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                  >
                    <option value="fiscal">Fiscal</option>
                    <option value="contabil">Cont&aacute;bil</option>
                    <option value="dp">DP</option>
                    <option value="consultoria">Consultoria</option>
                    <option value="administrativo">Administrativo</option>
                  </select>
                </div>

                {/* Data */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Data
                  </label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    required
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>

                {/* Duração */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Dura&ccedil;&atilde;o (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={duracaoMinutos}
                    onChange={(e) =>
                      setDuracaoMinutos(parseInt(e.target.value) || 0)
                    }
                    required
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDuracao(duracaoMinutos)}
                  </p>
                </div>

                {/* Descrição */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Descri&ccedil;&atilde;o
                  </label>
                  <input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva a atividade realizada"
                    required
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-slate-600">Data</th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    Cliente
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    Categoria
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    Descri&ccedil;&atilde;o
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600">
                    Dura&ccedil;&atilde;o
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      Carregando...
                    </td>
                  </tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                        {formatData(r.data)}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {r.clienteNome ?? r.clienteId}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            categoriaBadge[r.categoria] ?? categoriaBadge.administrativo
                          }`}
                        >
                          {r.categoria.charAt(0).toUpperCase() +
                            r.categoria.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{r.descricao}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                        {formatDuracao(r.duracaoMinutos)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
