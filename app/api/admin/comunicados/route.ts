import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
    const comunicados = await prisma.comunicado.findMany({
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json({ comunicados });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[GET /api/admin/comunicados]", err);
    return NextResponse.json({ erro: "Erro ao listar comunicados." }, { status: 500 });
  }
}

const CriarComunicadoSchema = z.object({
  titulo: z.string().min(1),
  mensagem: z.string().min(1),
  tipo: z.enum(["info", "aviso", "manutencao", "novidade"]),
  expiraEm: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = CriarComunicadoSchema.parse(body);

    const comunicado = await prisma.comunicado.create({
      data: {
        titulo: data.titulo,
        mensagem: data.mensagem,
        tipo: data.tipo,
        expiraEm: data.expiraEm ? new Date(data.expiraEm) : null,
      },
    });

    return NextResponse.json(comunicado, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[POST /api/admin/comunicados]", err);
    return NextResponse.json({ erro: "Erro ao criar comunicado." }, { status: 500 });
  }
}
