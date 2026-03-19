"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth";

interface RentabilidadeCliente {
  clienteId: string;
  clienteNome: string;
  horasGastas: number;
  honorarioMensal: number;
  valorHora: number;
  rentavel: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatHoras(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function RentabilidadePage() {
  const { escritorioId } = useAuth();
  const hoje = new Date();
  const mesDefault = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const [mes, setMes] = useState(mesDefault);
  const [dados, setDados] = useState<RentabilidadeCliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/timesheet/rentabilidade?escritorioId=${escritorioId}&mes=${mes}`
      );
      if (res.ok) {
        const json = await res.json();
        const raw: RentabilidadeCliente[] = json.data ?? json ?? [];
        // Sort by R$/hora descending
        raw.sort((a, b) => b.valorHora - a.valorHora);
        setDados(raw);
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Rentabilidade por Cliente
          </h1>
          <div>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Cliente
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Horas Gastas
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Honor&aacute;rio Mensal
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    R$/Hora
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Rent&aacute;vel?
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      Carregando...
                    </td>
                  </tr>
                ) : dados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      Nenhum dado de rentabilidade encontrado para este
                      per&iacute;odo.
                    </td>
                  </tr>
                ) : (
                  dados.map((d) => (
                    <tr key={d.clienteId} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {d.clienteNome}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {formatHoras(d.horasGastas)}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {formatCurrency(d.honorarioMensal)}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {formatCurrency(d.valorHora)}
                      </td>
                      <td className="px-5 py-3">
                        {d.rentavel ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
