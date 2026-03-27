"use client";

import { useRouter } from "next/navigation";

export function ExcluirModeloButton({ id }: { id: string }) {
  const router = useRouter();

  async function excluir() {
    if (!confirm("Excluir este modelo? Todos os contratos gerados a partir dele serão removidos.")) return;
    await fetch(`/api/modelos/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button onClick={excluir} className="text-red-400 hover:text-red-600 text-xs" title="Excluir modelo">
      ✕
    </button>
  );
}
