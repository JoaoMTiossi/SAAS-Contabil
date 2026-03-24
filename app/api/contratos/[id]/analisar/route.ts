import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLLMProvider } from "@/lib/llm/provider";
import { getSession } from "@/lib/auth/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    const { escritorioId } = await req.json();

    if (!escritorioId) {
      return NextResponse.json({ erro: "escritorioId é obrigatório." }, { status: 400 });
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        parcelas: true,
        obrigacoes: true,
      },
    });

    if (!contrato) {
      return NextResponse.json({ erro: "Contrato não encontrado." }, { status: 404 });
    }

    const provider = await getLLMProvider(escritorioId);
    if (!provider) {
      return NextResponse.json(
        { erro: "LLM não configurado. Vá em Configurações e adicione sua chave de API." },
        { status: 400 }
      );
    }

    const textoContrato = contrato.textoOriginal ?? "";
    const resumoContrato = `
Identificador: ${contrato.identificador ?? "N/A"}
Contratante: ${contrato.contratante ?? "N/A"}
Contratado: ${contrato.contratado ?? "N/A"}
Data Início: ${contrato.dataInicio?.toLocaleDateString("pt-BR") ?? "N/A"}
Data Fim: ${contrato.dataFim?.toLocaleDateString("pt-BR") ?? "N/A"}
Status: ${contrato.status}
Parcelas: ${contrato.parcelas.length}
Obrigações: ${contrato.obrigacoes.length}

Texto do contrato:
${textoContrato.substring(0, 6000)}
    `.trim();

    const response = await provider.chat([
      {
        role: "system",
        content: `Você é um assistente jurídico especializado em contratos de prestação de serviços contábeis no Brasil.
Analise o contrato fornecido e retorne uma análise em JSON com esta estrutura:
{
  "resumo": "resumo executivo em 2-3 frases",
  "riscos": ["lista de riscos identificados"],
  "clausulasImportantes": ["cláusulas que merecem atenção"],
  "sugestoes": ["sugestões de melhoria"],
  "pontuacao": número de 1 a 10 avaliando a qualidade do contrato
}
Responda APENAS o JSON, sem markdown.`,
      },
      {
        role: "user",
        content: resumoContrato,
      },
    ]);

    let analise;
    try {
      analise = JSON.parse(response);
    } catch {
      analise = { resumo: response, riscos: [], clausulasImportantes: [], sugestoes: [], pontuacao: null };
    }

    return NextResponse.json({ analise });
  } catch (err) {
    console.error("[POST /api/contratos/[id]/analisar]", err);
    return NextResponse.json({ erro: "Erro ao analisar contrato." }, { status: 500 });
  }
}
