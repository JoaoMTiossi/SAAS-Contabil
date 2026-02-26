/**
 * POST /api/upload
 * Recebe um arquivo .docx ou .txt e retorna o JSON extraído (para revisão).
 * Não salva no banco — apenas extrai e retorna para o usuário revisar.
 */

import { NextRequest, NextResponse } from "next/server";
import { extrairPrazos, extrairTextoDe } from "@/lib/extrator";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("arquivo") as File | null;

    if (!file) {
      return NextResponse.json(
        { erro: "Nenhum arquivo enviado. Use o campo 'arquivo'." },
        { status: 400 }
      );
    }

    const tiposPermitidos = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!tiposPermitidos.includes(file.type) && !file.name.endsWith(".docx") && !file.name.endsWith(".txt")) {
      return NextResponse.json(
        { erro: "Tipo de arquivo não suportado. Envie .docx ou .txt." },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let texto: string;

    if (file.name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
      texto = await extrairTextoDe(buffer);
    } else {
      texto = buffer.toString("utf-8");
    }

    if (!texto.trim()) {
      return NextResponse.json(
        { erro: "Arquivo vazio ou sem texto legível." },
        { status: 422 }
      );
    }

    const resultado = extrairPrazos(texto);

    return NextResponse.json({
      extraido: resultado,
      texto_original: texto.substring(0, 5000), // preview truncado
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json(
      { erro: "Erro ao processar o arquivo." },
      { status: 500 }
    );
  }
}
