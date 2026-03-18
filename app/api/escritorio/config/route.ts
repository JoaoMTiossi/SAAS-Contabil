/**
 * GET  /api/escritorio/config?escritorioId=xxx — obter config
 * PUT  /api/escritorio/config — atualizar config (LLM, email, etc.)
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
        llmProvider: "openai",
        llmApiKey: null,
        llmModel: null,
        emailRemetente: null,
      });
    }

    // Mascarar API key
    return NextResponse.json({
      ...config,
      llmApiKey: config.llmApiKey ? `${config.llmApiKey.substring(0, 8)}...` : null,
    });
  } catch (err) {
    console.error("[GET /api/escritorio/config]", err);
    return NextResponse.json({ erro: "Erro ao obter config." }, { status: 500 });
  }
}

const ConfigSchema = z.object({
  escritorioId: z.string(),
  llmProvider: z.enum(["openai", "gemini"]).optional(),
  llmApiKey: z.string().optional(),
  llmModel: z.string().optional(),
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
        llmProvider: data.llmProvider ?? "openai",
        llmApiKey: data.llmApiKey,
        llmModel: data.llmModel,
        emailRemetente: data.emailRemetente,
      },
      update: {
        ...(data.llmProvider && { llmProvider: data.llmProvider }),
        ...(data.llmApiKey && { llmApiKey: data.llmApiKey }),
        ...(data.llmModel !== undefined && { llmModel: data.llmModel }),
        ...(data.emailRemetente && { emailRemetente: data.emailRemetente }),
      },
    });

    return NextResponse.json({
      ...config,
      llmApiKey: config.llmApiKey ? `${config.llmApiKey.substring(0, 8)}...` : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PUT /api/escritorio/config]", err);
    return NextResponse.json({ erro: "Erro ao atualizar config." }, { status: 500 });
  }
}
