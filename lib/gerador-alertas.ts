/**
 * Gerador de Alertas
 * Produz os alertas para cada prazo cadastrado seguindo a régua:
 *  30d → info (Aviso)
 *  15d → atencao (Lembrete)
 *   7d → urgente
 *   1d → critico
 *   0d → critico (Venceu hoje)
 *  <0d → critico (Atrasado) — um único alerta se já vencido
 */

import { format, differenceInCalendarDays, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrioridadeAlerta, TipoAlerta, REGUA_ALERTAS } from "@/types/contrato";

export interface AlertaInput {
  refTipo: TipoAlerta;
  refDescricao: string;
  dataVencimento: Date;
  /** ID de referência no banco (parcelaId, obrigacaoId, ou undefined) */
  refId?: string;
  canais?: string[];
}

export interface AlertaBuilt {
  refTipo: TipoAlerta;
  refDescricao: string;
  dataAlerta: Date;
  antecedenciaDias: number;
  prioridade: PrioridadeAlerta;
  canais: string[];
  /** Apenas preenchido quando relacionado a parcela ou obrigação */
  parcelaId?: string;
  obrigacaoId?: string;
}

const CANAIS_DEFAULT = ["email", "dashboard"];

/** Formata data para DD/MM/AAAA */
export function formatarData(d: Date): string {
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Gera todos os alertas para um prazo.
 * Se a data já passou, gera apenas um alerta "Atrasado".
 */
export function gerarAlertasParaPrazo(input: AlertaInput): AlertaBuilt[] {
  const hoje = startOfDay(new Date());
  const vencimento = startOfDay(input.dataVencimento);
  const diasRestantes = differenceInCalendarDays(vencimento, hoje);
  const canais = input.canais ?? CANAIS_DEFAULT;

  // Determina parcelaId / obrigacaoId pelo refTipo
  const parcelaId =
    input.refTipo === "parcela" ? input.refId : undefined;
  const obrigacaoId =
    input.refTipo === "obrigacao" ? input.refId : undefined;

  // Já vencido → único alerta "Atrasado"
  if (diasRestantes < 0) {
    return [
      {
        refTipo: input.refTipo,
        refDescricao: input.refDescricao,
        dataAlerta: hoje,
        antecedenciaDias: diasRestantes, // negativo
        prioridade: "critico",
        canais,
        parcelaId,
        obrigacaoId,
      },
    ];
  }

  const alertas: AlertaBuilt[] = [];

  for (const regra of REGUA_ALERTAS) {
    // Só gera se ainda não passou a data do alerta (ex: não gera alerta de 30d se faltam 5d)
    if (diasRestantes >= regra.diasAntes) {
      const dataAlerta = startOfDay(subDays(vencimento, regra.diasAntes));
      alertas.push({
        refTipo: input.refTipo,
        refDescricao: input.refDescricao,
        dataAlerta,
        antecedenciaDias: regra.diasAntes,
        prioridade: regra.prioridade,
        canais,
        parcelaId,
        obrigacaoId,
      });
    }
  }

  return alertas;
}

/**
 * Constrói a lista completa de alertas para um contrato
 * com base nas datas de vencimento, parcelas e obrigações.
 */
export interface ContratoAlertas {
  contratoId: string;
  dataFim?: Date | null;
  prazoAvisoCancelamento?: Date | null;
  renovacaoAutomatica?: boolean | null;
  parcelas: Array<{ id: string; numero: number; vencimento: Date | null; descricao: string | null }>;
  obrigacoes: Array<{ id: string; descricao: string; prazo: Date | null }>;
}

export function gerarAlertasContrato(contrato: ContratoAlertas): AlertaBuilt[] {
  const todos: AlertaBuilt[] = [];

  // Vencimento geral
  if (contrato.dataFim) {
    todos.push(
      ...gerarAlertasParaPrazo({
        refTipo: "vencimento_geral",
        refDescricao: `Vencimento do contrato ${contrato.contratoId}`,
        dataVencimento: contrato.dataFim,
        canais: CANAIS_DEFAULT,
      })
    );
  }

  // Prazo de aviso de não-renovação
  if (contrato.prazoAvisoCancelamento) {
    todos.push(
      ...gerarAlertasParaPrazo({
        refTipo: "renovacao",
        refDescricao: "Prazo limite para aviso de não renovação",
        dataVencimento: contrato.prazoAvisoCancelamento,
        canais: CANAIS_DEFAULT,
      })
    );
  }

  // Parcelas
  for (const parcela of contrato.parcelas) {
    if (parcela.vencimento) {
      todos.push(
        ...gerarAlertasParaPrazo({
          refTipo: "parcela",
          refDescricao: parcela.descricao ?? `Parcela ${parcela.numero}`,
          dataVencimento: parcela.vencimento,
          refId: parcela.id,
          canais: CANAIS_DEFAULT,
        })
      );
    }
  }

  // Obrigações
  for (const obrigacao of contrato.obrigacoes) {
    if (obrigacao.prazo) {
      todos.push(
        ...gerarAlertasParaPrazo({
          refTipo: "obrigacao",
          refDescricao: obrigacao.descricao.substring(0, 100),
          dataVencimento: obrigacao.prazo,
          refId: obrigacao.id,
          canais: CANAIS_DEFAULT,
        })
      );
    }
  }

  return todos;
}
