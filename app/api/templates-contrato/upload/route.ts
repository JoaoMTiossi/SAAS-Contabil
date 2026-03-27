/**
 * POST /api/templates-contrato/upload — upload DOCX to create template
 * Variables in the document should be in {{variavel}} format
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extrairTextoDe } from "@/lib/extrator";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("arquivo") as File | null;
    const nome = formData.get("nome") as string | null;
    const tipo = (formData.get("tipo") as string) || "custom";
    const escritorioId = formData.get("escritorioId") as string | null;

    if (!file) {
      return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (!nome) {
      return NextResponse.json({ erro: "Nome do template é obrigatório." }, { status: 400 });
    }

    if (!escritorioId) {
      return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
    }

    const validTypes = ["prestacao_servicos", "consultoria", "bpo", "aditivo", "distrato", "custom"];
    if (!validTypes.includes(tipo)) {
      return NextResponse.json({ erro: "Tipo de template inválido." }, { status: 400 });
    }

    if (!file.name.endsWith(".docx") && !file.name.endsWith(".txt")) {
      return NextResponse.json(
        { erro: "Tipo de arquivo não suportado. Envie .docx ou .txt." },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let conteudo: string;
    if (file.name.endsWith(".docx")) {
      conteudo = await extrairTextoDe(buffer);
    } else {
      conteudo = buffer.toString("utf-8");
    }

    if (!conteudo.trim()) {
      return NextResponse.json({ erro: "Arquivo vazio ou sem texto legível." }, { status: 422 });
    }

    // Extract variables from content
    const regex = /\{\{(\w+)\}\}/g;
    const variaveis: string[] = [];
    let match;
    while ((match = regex.exec(conteudo)) !== null) {
      if (!variaveis.includes(match[1])) {
        variaveis.push(match[1]);
      }
    }

    const template = await prisma.templateContrato.create({
      data: {
        nome,
        tipo: tipo as "prestacao_servicos" | "consultoria" | "bpo" | "aditivo" | "distrato" | "custom",
        conteudo,
        variaveis,
        escritorioId,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("[POST /api/templates-contrato/upload]", err);
    return NextResponse.json({ erro: "Erro ao processar o arquivo." }, { status: 500 });
  }
}
