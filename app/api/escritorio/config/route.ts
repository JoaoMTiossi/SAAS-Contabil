/**
 * GET  /api/escritorio/config?escritorioId=xxx — obter config
 * PUT  /api/escritorio/config — atualizar config (email, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const config = await prisma.escritorioConfig.findUnique({
      where: { escritorioId },
    });

    if (!config) {
      return NextResponse.json({
        escritorioId,
        emailRemetente: null,
      });
    }

    return NextResponse.json({
      escritorioId: config.escritorioId,
      emailRemetente: config.emailRemetente,
    });
  } catch (err) {
    console.error("[GET /api/escritorio/config]", err);
    return NextResponse.json({ erro: "Erro ao obter config." }, { status: 500 });
  }
}

const ConfigSchema = z.object({
  escritorioId: z.string(),
  emailRemetente: z.string().email().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ConfigSchema.parse(body);

    const config = await prisma.escritorioConfig.upsert({
      where: { escritorioId: data.escritorioId },
      create: {
        escritorioId: data.escritorioId,
        emailRemetente: data.emailRemetente,
      },
      update: {
        ...(data.emailRemetente && { emailRemetente: data.emailRemetente }),
      },
    });

    return NextResponse.json({
      escritorioId: config.escritorioId,
      emailRemetente: config.emailRemetente,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PUT /api/escritorio/config]", err);
    return NextResponse.json({ erro: "Erro ao atualizar config." }, { status: 500 });
  }
}
