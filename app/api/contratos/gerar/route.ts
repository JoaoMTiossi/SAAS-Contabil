/**
 * POST /api/contratos/gerar — gerar contrato a partir de template
 */

import { NextRequest, NextResponse } from "next/server";
import { gerarContrato } from "@/lib/agents/agente-geracao-contratos";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

const GerarContratoSchema = z.object({
  templateId: z.string(),
  variaveis: z.record(z.string(), z.string()),
  clienteId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = GerarContratoSchema.parse(body);
    const resultado = await gerarContrato(data);
    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/contratos/gerar]", err);
    return NextResponse.json({ erro: "Erro ao gerar contrato." }, { status: 500 });
  }
}
