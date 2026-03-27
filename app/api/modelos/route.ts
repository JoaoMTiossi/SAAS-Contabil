import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CriarModeloSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().nullable().optional(),
  conteudoHtml: z.string().min(1, "Conteúdo do template é obrigatório"),
  variaveis: z.array(z.string()).default([]),
});

export async function GET() {
  const modelos = await prisma.modeloContrato.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { gerados: true } },
    },
  });

  return NextResponse.json(modelos);
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    // Upload de arquivo DOCX
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("arquivo") as File | null;
      const nome = formData.get("nome") as string | null;
      const descricao = formData.get("descricao") as string | null;

      if (!file) {
        return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
      }
      if (!nome?.trim()) {
        return NextResponse.json({ erro: "Nome do modelo é obrigatório." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      let html: string;

      if (file.name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ buffer });
        html = result.value;
      } else if (file.name.endsWith(".txt")) {
        html = `<p>${buffer.toString("utf-8").replace(/\n/g, "</p><p>")}</p>`;
      } else {
        return NextResponse.json({ erro: "Formato não suportado. Use .docx ou .txt." }, { status: 415 });
      }

      // Extrair variáveis {{variavel}} do conteúdo
      const variaveis = Array.from(
        new Set(html.match(/\{\{(\w+)\}\}/g)?.map((m) => m.replace(/\{\{|\}\}/g, "")) ?? [])
      );

      const modelo = await prisma.modeloContrato.create({
        data: {
          nome: nome.trim(),
          descricao: descricao?.trim() || null,
          conteudoHtml: html,
          variaveis,
        },
      });

      return NextResponse.json(modelo, { status: 201 });
    }

    // JSON direto
    const body = await req.json();
    const data = CriarModeloSchema.parse(body);

    const variaveis = data.variaveis.length > 0
      ? data.variaveis
      : Array.from(
          new Set(data.conteudoHtml.match(/\{\{(\w+)\}\}/g)?.map((m: string) => m.replace(/\{\{|\}\}/g, "")) ?? [])
        );

    const modelo = await prisma.modeloContrato.create({
      data: {
        nome: data.nome,
        descricao: data.descricao ?? null,
        conteudoHtml: data.conteudoHtml,
        variaveis,
      },
    });

    return NextResponse.json(modelo, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.issues }, { status: 400 });
    }
    console.error("[POST /api/modelos]", err);
    return NextResponse.json({ erro: "Erro ao criar modelo." }, { status: 500 });
  }
}
