"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProcessarAlertasBtn() {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function processar() {
    setProcessando(true);
    setResultado(null);
    setErro(null);
    try {
      const res = await fetch("/api/alertas/processar", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.erro ?? "Erro ao processar alertas.");
      } else {
        setResultado(json.mensagem ?? "Processado com sucesso.");
        router.refresh();
      }
    } catch {
      setErro("Erro de conexão ao processar alertas.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={processar}
        disabled={processando}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {processando ? "Processando..." : "⚙ Processar Alertas"}
      </button>
      {resultado && <span className="text-xs text-green-600">{resultado}</span>}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}
