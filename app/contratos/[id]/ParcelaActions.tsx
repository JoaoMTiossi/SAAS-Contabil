"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  parcelaId: string;
  contratoId: string;
  statusAtual: string;
}

export function ParcelaActions({ parcelaId, contratoId, statusAtual }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  if (statusAtual !== "pendente" && statusAtual !== "atrasado") return null;

  async function atualizar(status: string) {
    setSalvando(true);
    await fetch(`/api/contratos/${contratoId}/parcelas/${parcelaId}`, {
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
        onClick={() => atualizar("pago")}
        disabled={salvando}
        className="rounded px-2 py-0.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        Pago
      </button>
      <button
        onClick={() => atualizar("atrasado")}
        disabled={salvando || statusAtual === "atrasado"}
        className="rounded px-2 py-0.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Atrasado
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
