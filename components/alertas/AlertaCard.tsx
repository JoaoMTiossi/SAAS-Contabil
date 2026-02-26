"use client";

import { PrioridadeAlerta, TipoAlerta } from "@/types/contrato";

interface AlertaCardProps {
  id: string;
  refTipo: TipoAlerta;
  refDescricao: string;
  dataAlerta: string;
  antecedenciaDias: number;
  prioridade: PrioridadeAlerta;
  canais: string[];
  status: string;
  contrato?: {
    identificador: string | null;
    contratante: string | null;
    contratado: string | null;
  };
}

const PRIORIDADE_CONFIG: Record<
  PrioridadeAlerta,
  { borda: string; fundo: string; icone: string; texto: string }
> = {
  info: {
    borda: "border-l-blue-400",
    fundo: "bg-blue-50",
    icone: "ℹ️",
    texto: "text-blue-700",
  },
  atencao: {
    borda: "border-l-yellow-400",
    fundo: "bg-yellow-50",
    icone: "⚠️",
    texto: "text-yellow-700",
  },
  urgente: {
    borda: "border-l-orange-400",
    fundo: "bg-orange-50",
    icone: "🔔",
    texto: "text-orange-700",
  },
  critico: {
    borda: "border-l-red-500",
    fundo: "bg-red-50",
    icone: "🚨",
    texto: "text-red-700",
  },
};

const TIPO_LABEL: Record<TipoAlerta, string> = {
  vencimento_geral: "Vencimento",
  parcela: "Parcela",
  obrigacao: "Obrigação",
  renovacao: "Renovação",
};

function etiquetaAntecedencia(dias: number): string {
  if (dias < 0) return "Atrasado";
  if (dias === 0) return "Venceu hoje";
  if (dias === 1) return "Vence amanhã";
  return `Faltam ${dias} dias`;
}

export function AlertaCard({
  refTipo,
  refDescricao,
  dataAlerta,
  antecedenciaDias,
  prioridade,
  canais,
  status,
  contrato,
}: AlertaCardProps) {
  const config = PRIORIDADE_CONFIG[prioridade];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-l-4 p-4 ${config.borda} ${config.fundo}`}
    >
      <span className="mt-0.5 text-xl">{config.icone}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs font-semibold uppercase tracking-wide ${config.texto}`}>
            {TIPO_LABEL[refTipo]}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.texto} bg-white/60`}>
            {etiquetaAntecedencia(antecedenciaDias)}
          </span>
          {status === "cancelado" && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
              Cancelado
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-800 truncate">{refDescricao}</p>
        {contrato && (
          <p className="text-xs text-gray-500 truncate">
            {contrato.identificador ?? "Contrato"} ·{" "}
            {contrato.contratante ?? contrato.contratado ?? ""}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <span>📅 {dataAlerta}</span>
          <span>
            {canais.includes("email") && "📧 "}
            {canais.includes("dashboard") && "📊 "}
            {canais.join(", ")}
          </span>
        </div>
      </div>
    </div>
  );
}
