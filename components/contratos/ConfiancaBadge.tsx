"use client";

import { NivelConfianca } from "@/types/contrato";

interface Props {
  nivel: NivelConfianca;
  label?: string;
}

const CONFIG: Record<NivelConfianca, { cor: string; texto: string; titulo: string }> = {
  alta: {
    cor: "bg-green-100 text-green-800 border-green-200",
    texto: "Alta",
    titulo: "Data encontrada explicitamente no contrato",
  },
  media: {
    cor: "bg-yellow-100 text-yellow-800 border-yellow-200",
    texto: "Média",
    titulo: "Data calculada ou inferida — revise antes de confirmar",
  },
  baixa: {
    cor: "bg-red-100 text-red-800 border-red-200",
    texto: "Baixa",
    titulo: "Não encontrado — preenchimento manual necessário",
  },
};

export function ConfiancaBadge({ nivel, label }: Props) {
  const { cor, texto, titulo } = CONFIG[nivel];
  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${cor}`}
    >
      {label ?? `Confiança: ${texto}`}
    </span>
  );
}
