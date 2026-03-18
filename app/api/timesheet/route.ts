/**
 * GET  /api/timesheet?usuarioId=xxx&periodo=semana|mes
 * POST /api/timesheet — registrar horas
 */

import { NextRequest, NextResponse } from "next/server";
import { registrarHoras, listarLancamentos } from "@/lib/agents/agente-timesheet";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const usuarioId = req.nextUrl.searchParams.get("usuarioId");
  const periodo = (req.nextUrl.searchParams.get("periodo") ?? "semana") as "semana" | "mes";

  if (!usuarioId) {
    return NextResponse.json({ erro: "usuarioId é obrigatório." }, { status: 400 });
  }

  try {
    const lancamentos = await listarLancamentos(usuarioId, periodo);
    return NextResponse.json({ lancamentos });
  } catch (err) {
    console.error("[GET /api/timesheet]", err);
    return NextResponse.json({ erro: "Erro ao listar timesheet." }, { status: 500 });
  }
}

const RegistrarSchema = z.object({
  usuarioId: z.string(),
  clienteId: z.string(),
  categoria: z.enum(["fiscal", "contabil", "dp", "consultoria", "administrativo"]),
  descricao: z.string().optional(),
  data: z.string().transform((s) => new Date(s)),
  horaInicio: z.string().transform((s) => new Date(s)).optional(),
  horaFim: z.string().transform((s) => new Date(s)).optional(),
  duracao: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RegistrarSchema.parse(body);
    const registro = await registrarHoras(data);
    return NextResponse.json(registro, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/timesheet]", err);
    return NextResponse.json({ erro: "Erro ao registrar horas." }, { status: 500 });
  }
}
