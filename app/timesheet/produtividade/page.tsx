"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth";

interface CategoriaBreakdown {
  categoria: string;
  minutos: number;
}

interface Colaborador {
  usuarioId: string;
  nome: string;
  horasRealizadas: number;
  meta: number;
  categorias: CategoriaBreakdown[];
}

const categoriaCores: Record<string, { bar: string; label: string }> = {
  fiscal: { bar: "bg-blue-500", label: "bg-blue-100 text-blue-700" },
  contabil: { bar: "bg-purple-500", label: "bg-purple-100 text-purple-700" },
  dp: { bar: "bg-green-500", label: "bg-green-100 text-green-700" },
  consultoria: { bar: "bg-orange-500", label: "bg-orange-100 text-orange-700" },
  administrativo: { bar: "bg-slate-400", label: "bg-slate-100 text-slate-700" },
};

function formatHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  return `${h}h`;
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export default function ProdutividadePage() {
  const { escritorioId } = useAuth();
  const hoje = new Date();
  const mesDefault = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const [mes, setMes] = useState(mesDefault);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/timesheet/produtividade?escritorioId=${escritorioId}&mes=${mes}`
      );
      if (res.ok) {
        const json = await res.json();
        setColaboradores(json.data ?? json ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [mes, escritorioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Produtividade</h1>
          <div>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <p className="py-12 text-center text-slate-400">Carregando...</p>
        ) : colaboradores.length === 0 ? (
          <p className="py-12 text-center text-slate-400">
            Nenhum dado de produtividade encontrado para este per&iacute;odo.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {colaboradores.map((c) => {
              const pct =
                c.meta > 0
                  ? Math.min(Math.round((c.horasRealizadas / c.meta) * 100), 100)
                  : 0;
              const pctReal =
                c.meta > 0
                  ? Math.round((c.horasRealizadas / c.meta) * 100)
                  : 0;

              return (
                <div
                  key={c.usuarioId}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  {/* Nome */}
                  <h3 className="text-lg font-semibold text-slate-900">
                    {c.nome}
                  </h3>

                  {/* Horas realizadas / meta */}
                  <p className="mt-1 text-sm text-slate-500">
                    {formatHoras(c.horasRealizadas * 60)} / {formatHoras(c.meta * 60)}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progresso</span>
                      <span className="font-medium text-slate-700">
                        {pctReal}%
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(pctReal)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Breakdown by category */}
                  {c.categorias && c.categorias.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-slate-500">
                        Por categoria
                      </p>
                      {c.categorias.map((cat) => {
                        const cores =
                          categoriaCores[cat.categoria] ??
                          categoriaCores.administrativo;
                        const catPct =
                          c.horasRealizadas > 0
                            ? Math.round(
                                (cat.minutos / 60 / c.horasRealizadas) * 100
                              )
                            : 0;
                        return (
                          <div key={cat.categoria} className="flex items-center gap-2">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cores.label}`}
                            >
                              {cat.categoria.charAt(0).toUpperCase() +
                                cat.categoria.slice(1)}
                            </span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${cores.bar}`}
                                style={{ width: `${catPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">
                              {formatHoras(cat.minutos)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
