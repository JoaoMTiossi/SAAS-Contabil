// ─────────────────────────────────────────────
// Tipos centrais do módulo de gestão de prazos
// ─────────────────────────────────────────────

export type NivelConfianca = "alta" | "media" | "baixa";

export type StatusContrato = "ativo" | "encerrado" | "renovado" | "cancelado";
export type StatusParcela = "pendente" | "pago" | "cancelado" | "atrasado";
export type StatusObrigacao =
  | "pendente"
  | "entregue"
  | "cancelado"
  | "atrasado";
export type StatusAlerta = "agendado" | "enviado" | "cancelado";
export type PrioridadeAlerta = "info" | "atencao" | "urgente" | "critico";
export type TipoAlerta =
  | "vencimento_geral"
  | "parcela"
  | "obrigacao"
  | "renovacao";

// ─────────────────────────────────────────────
// JSON de extração retornado ao usuário
// ─────────────────────────────────────────────

export interface ParcelaExtraida {
  numero: number;
  descricao: string | null;
  valor: string | null;
  vencimento: string | null; // DD/MM/AAAA
  status: "pendente";
}

export interface ObrigacaoExtraida {
  descricao: string;
  responsavel: "contratante" | "contratado" | null;
  prazo: string | null; // DD/MM/AAAA
  status: "pendente";
}

export interface ContratoExtraido {
  contrato: {
    identificador: string | null;
    partes: {
      contratante: string | null;
      contratado: string | null;
    };
  };
  vencimento_geral: {
    data_inicio: string | null;
    data_fim: string | null;
    renovacao_automatica: boolean | null;
    prazo_aviso_cancelamento: string | null;
  };
  parcelas: ParcelaExtraida[];
  obrigacoes: ObrigacaoExtraida[];
  confianca: {
    vencimento_geral: NivelConfianca;
    parcelas: NivelConfianca;
    obrigacoes: NivelConfianca;
  };
}

// ─────────────────────────────────────────────
// Alertas
// ─────────────────────────────────────────────

export interface AlertaGerado {
  ref_tipo: TipoAlerta;
  ref_descricao: string;
  data_alerta: string; // DD/MM/AAAA
  antecedencia_dias: number;
  prioridade: PrioridadeAlerta;
  canal: string[];
  status: "agendado";
}

export interface AlertasResponse {
  alertas: AlertaGerado[];
}

// Régua de antecedência para alertas
export const REGUA_ALERTAS: Array<{
  diasAntes: number;
  prioridade: PrioridadeAlerta;
  label: string;
}> = [
  { diasAntes: 30, prioridade: "info", label: "Aviso" },
  { diasAntes: 15, prioridade: "atencao", label: "Lembrete" },
  { diasAntes: 7, prioridade: "urgente", label: "Urgente" },
  { diasAntes: 1, prioridade: "critico", label: "Crítico" },
  { diasAntes: 0, prioridade: "critico", label: "Venceu hoje" },
];
