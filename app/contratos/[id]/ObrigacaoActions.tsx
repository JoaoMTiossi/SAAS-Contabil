"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  obrigacaoId: string;
  contratoId: string;
  statusAtual: string;
}

export function ObrigacaoActions({ obrigacaoId, contratoId, statusAtual }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  if (statusAtual !== "pendente" && statusAtual !== "atrasado") return null;

  async function atualizar(status: string) {
    setSalvando(true);
    await fetch(`/api/contratos/${contratoId}/obrigacoes/${obrigacaoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => atualizar("entregue")}
        disabled={salvando}
        className="rounded px-2 py-0.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        Entregue
      </button>
      <button
        onClick={() => atualizar("cancelado")}
        disabled={salvando}
        className="rounded px-2 py-0.5 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  );
}
