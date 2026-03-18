/**
 * Agente Extrator
 * Extrai dados estruturados de contratos usando extração regex.
 */

import { ContratoExtraido } from "@/types/contrato";
import { extrairPrazos } from "@/lib/extrator";

/**
 * Extrai dados do contrato usando extração regex.
 */
export async function executarAgenteExtrator(
  textoContrato: string
): Promise<ContratoExtraido> {
  return extrairPrazos(textoContrato);
}
