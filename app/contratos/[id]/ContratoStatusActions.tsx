"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  status: string;
}

const STATUS_TRANSICOES: Record<string, string[]> = {
  ativo: ["encerrado", "renovado", "cancelado"],
  encerrado: ["renovado"],
  renovado: ["encerrado", "cancelado"],
  cancelado: [],
};

const STATUS_COR: Record<string, string> = {
  ativo: "bg-green-100 text-green-700",
  encerrado: "bg-gray-100 text-gray-600",
  renovado: "bg-blue-100 text-blue-700",
  cancelado: "bg-red-100 text-red-700",
};

export function ContratoStatusActions({ id, status }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const transicoes = STATUS_TRANSICOES[status] ?? [];

  async function mudarStatus(novoStatus: string) {
    setSalvando(true);
    await fetch(`/api/contratos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COR[status]}`}>
        {status}
      </span>
      {transicoes.length > 0 && (
        <select
          defaultValue=""
          disabled={salvando}
          onChange={(e) => { if (e.target.value) mudarStatus(e.target.value); }}
          className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:outline-none"
        >
          <option value="">Alterar status...</option>
          {transicoes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      )}
    </div>
  );
}
