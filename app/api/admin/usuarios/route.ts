import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireAdmin();
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        escritorioId: true,
        createdAt: true,
        escritorio: { select: { nome: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ usuarios });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[GET /api/admin/usuarios]", err);
    return NextResponse.json({ erro: "Erro ao listar usuários." }, { status: 500 });
  }
}

const CriarUsuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.enum(["admin", "colaborador"]).default("colaborador"),
  escritorioId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = CriarUsuarioSchema.parse(body);

    const senhaHash = await bcrypt.hash(data.senha, 12);
    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        role: data.role,
        escritorioId: data.escritorioId,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        escritorioId: true,
        createdAt: true,
        escritorio: { select: { nome: true } },
      },
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Erro";
    if (msg === "Não autenticado" || msg === "Acesso negado")
      return NextResponse.json({ erro: msg }, { status: 403 });
    console.error("[POST /api/admin/usuarios]", err);
    return NextResponse.json({ erro: "Erro ao criar usuário." }, { status: 500 });
  }
}
