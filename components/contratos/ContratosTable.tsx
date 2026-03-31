"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";

type Status = "ativo" | "encerrado" | "renovado" | "cancelado";

const STATUS_CONFIG: Record<Status, string> = {
  ativo: "bg-green-100 text-green-700",
  encerrado: "bg-gray-100 text-gray-600",
  renovado: "bg-blue-100 text-blue-700",
  cancelado: "bg-red-100 text-red-700",
};

type Contrato = {
  id: string;
  identificador: string | null;
  contratante: string | null;
  contratado: string | null;
  dataFim: Date | null;
  status: string;
  _count: { parcelas: number; alertas: number };
};

type Coluna = "identificador" | "contratante" | "dataFim" | "status" | "parcelas" | "alertas";

interface Props {
  contratos: Contrato[];
}

export function ContratosTable({ contratos }: Props) {
  const [busca, setBusca] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<Coluna>("identificador");
  const [direcao, setDirecao] = useState<"asc" | "desc">("asc");

  function toggleOrdenar(col: Coluna) {
    if (ordenarPor === col) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrdenarPor(col);
      setDirecao("asc");
    }
  }

  function iconeOrdem(col: Coluna) {
    if (ordenarPor !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return (
      <span className="ml-1 text-blue-500">{direcao === "asc" ? "↑" : "↓"}</span>
    );
  }

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return contratos.filter((c) => {
      if (!termo) return true;
      return (
        (c.identificador ?? "").toLowerCase().includes(termo) ||
        (c.contratante ?? "").toLowerCase().includes(termo) ||
        (c.contratado ?? "").toLowerCase().includes(termo) ||
        c.status.toLowerCase().includes(termo)
      );
    });
  }, [contratos, busca]);

  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      let va: string | number | null = null;
      let vb: string | number | null = null;

      switch (ordenarPor) {
        case "identificador":
          va = a.identificador ?? "";
          vb = b.identificador ?? "";
          break;
        case "contratante":
          va = a.contratante ?? "";
          vb = b.contratante ?? "";
          break;
        case "dataFim":
          va = a.dataFim ? a.dataFim.getTime() : 0;
          vb = b.dataFim ? b.dataFim.getTime() : 0;
          break;
        case "status":
          va = a.status;
          vb = b.status;
          break;
        case "parcelas":
          va = a._count.parcelas;
          vb = b._count.parcelas;
          break;
        case "alertas":
          va = a._count.alertas;
          vb = b._count.alertas;
          break;
      }

      if (va === null || va === undefined) va = "";
      if (vb === null || vb === undefined) vb = "";

      if (typeof va === "number" && typeof vb === "number") {
        return direcao === "asc" ? va - vb : vb - va;
      }

      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return direcao === "asc" ? sa.localeCompare(sb, "pt-BR") : sb.localeCompare(sa, "pt-BR");
    });
  }, [filtrados, ordenarPor, direcao]);

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por identificador, partes ou status..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {ordenados.length} de {contratos.length} contrato(s)
        </span>
      </div>

      {ordenados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          {busca ? `Nenhum resultado para "${busca}".` : "Nenhum contrato encontrado."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 hover:text-blue-600 select-none"
                  onClick={() => toggleOrdenar("identificador")}
                >
                  Identificador {iconeOrdem("identificador")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 hover:text-blue-600 select-none"
                  onClick={() => toggleOrdenar("contratante")}
                >
                  Partes {iconeOrdem("contratante")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 hover:text-blue-600 select-none"
                  onClick={() => toggleOrdenar("dataFim")}
                >
                  Término {iconeOrdem("dataFim")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center font-semibold text-gray-600 hover:text-blue-600 select-none"
                  onClick={() => toggleOrdenar("parcelas")}
                >
                  Parcelas {iconeOrdem("parcelas")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center font-semibold text-gray-600 hover:text-blue-600 select-none"
                  onClick={() => toggleOrdenar("alertas")}
                >
                  Alertas {iconeOrdem("alertas")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 hover:text-blue-600 select-none"
                  onClick={() => toggleOrdenar("status")}
                >
                  Status {iconeOrdem("status")}
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordenados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.identificador ?? <span className="text-gray-400 italic">Sem ID</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{c.contratante ?? "—"}</div>
                    <div className="text-xs text-gray-400">{c.contratado ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.dataFim ? format(c.dataFim, "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.parcelas}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.alertas}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[c.status as Status]}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contratos/${c.id}`} className="text-blue-600 hover:underline text-xs">
                      Ver →
                    </Link>
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
