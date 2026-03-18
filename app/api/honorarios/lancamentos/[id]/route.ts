/**
 * PATCH /api/honorarios/lancamentos/[id] — registrar pagamento
 */

import { NextRequest, NextResponse } from "next/server";
import { registrarPagamento } from "@/lib/agents/agente-cobranca";
import { z } from "zod";

const PagamentoSchema = z.object({
  dataPagamento: z.string().transform((s) => new Date(s)).refine((d) => !isNaN(d.getTime()), { message: "Data de pagamento inválida" }),
  valorPago: z.number().positive(),
  observacao: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = PagamentoSchema.parse(body);
    const lancamento = await registrarPagamento(id, data);
    return NextResponse.json(lancamento);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/honorarios/lancamentos/[id]]", err);
    return NextResponse.json({ erro: "Erro ao registrar pagamento." }, { status: 500 });
  }
}
