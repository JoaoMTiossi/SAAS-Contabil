/**
 * GET  /api/escritorio/config?escritorioId=xxx — obter config completa
 * PUT  /api/escritorio/config — atualizar config (escritório + SMTP + email)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const escritorioId = req.nextUrl.searchParams.get("escritorioId");
  if (!escritorioId) {
    return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
  }

  try {
    const escritorio = await prisma.escritorio.findUnique({
      where: { id: escritorioId },
      include: { config: true },
    });

    if (!escritorio) {
      return NextResponse.json({ erro: "Escritório não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      escritorioId: escritorio.id,
      nome: escritorio.nome,
      cnpj: escritorio.cnpj,
      email: escritorio.email,
      emailRemetente: escritorio.config?.emailRemetente ?? null,
      smtpHost: escritorio.config?.smtpHost ?? null,
      smtpPort: escritorio.config?.smtpPort ?? null,
      smtpUser: escritorio.config?.smtpUser ?? null,
      smtpPass: escritorio.config?.smtpPass ? "••••••••" : null,
      smtpSecure: escritorio.config?.smtpSecure ?? true,
      llmProvider: escritorio.config?.llmProvider ?? "openai",
      llmApiKey: escritorio.config?.llmApiKey ? "••••••••" : null,
      llmModel: escritorio.config?.llmModel ?? null,
    });
  } catch (err) {
    console.error("[GET /api/escritorio/config]", err);
    return NextResponse.json({ erro: "Erro ao obter config." }, { status: 500 });
  }
}

const ConfigSchema = z.object({
  escritorioId: z.string(),
  nome: z.string().min(1).optional(),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  emailRemetente: z.string().email().optional().nullable(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().optional().nullable(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpSecure: z.boolean().optional(),
  llmProvider: z.enum(["openai", "gemini"]).optional(),
  llmApiKey: z.string().optional().nullable(),
  llmModel: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ConfigSchema.parse(body);

    // Update escritorio basic info
    const updateEscritorio: Record<string, unknown> = {};
    if (data.nome) updateEscritorio.nome = data.nome;
    if (data.cnpj !== undefined) updateEscritorio.cnpj = data.cnpj || null;
    if (data.email) updateEscritorio.email = data.email;

    if (Object.keys(updateEscritorio).length > 0) {
      await prisma.escritorio.update({
        where: { id: data.escritorioId },
        data: updateEscritorio,
      });
    }

    // Update config (upsert)
    const configData: Record<string, unknown> = {};
    if (data.emailRemetente !== undefined) configData.emailRemetente = data.emailRemetente;
    if (data.smtpHost !== undefined) configData.smtpHost = data.smtpHost;
    if (data.smtpPort !== undefined) configData.smtpPort = data.smtpPort;
    if (data.smtpUser !== undefined) configData.smtpUser = data.smtpUser;
    if (data.smtpPass !== undefined && data.smtpPass !== "••••••••") {
      configData.smtpPass = data.smtpPass;
    }
    if (data.smtpSecure !== undefined) configData.smtpSecure = data.smtpSecure;
    if (data.llmProvider !== undefined) configData.llmProvider = data.llmProvider;
    if (data.llmApiKey !== undefined && data.llmApiKey !== "••••••••") {
      configData.llmApiKey = data.llmApiKey;
    }
    if (data.llmModel !== undefined) configData.llmModel = data.llmModel;

    await prisma.escritorioConfig.upsert({
      where: { escritorioId: data.escritorioId },
      create: {
        escritorioId: data.escritorioId,
        ...configData,
      },
      update: configData,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[PUT /api/escritorio/config]", err);
    return NextResponse.json({ erro: "Erro ao atualizar config." }, { status: 500 });
  }
}
