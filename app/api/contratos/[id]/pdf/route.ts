import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarPDFContrato } from "@/lib/pdf/gerar-pdf-contrato";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;

    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        parcelas: { orderBy: { numero: "asc" } },
        obrigacoes: true,
        assinaturas: true,
      },
    });

    if (!contrato) {
      return NextResponse.json({ erro: "Contrato não encontrado." }, { status: 404 });
    }

    const pdfBuffer = await gerarPDFContrato({
      identificador: contrato.identificador,
      contratante: contrato.contratante,
      contratado: contrato.contratado,
      dataInicio: contrato.dataInicio,
      dataFim: contrato.dataFim,
      status: contrato.status,
      textoOriginal: contrato.textoOriginal,
      parcelas: contrato.parcelas.map((p) => ({
        numero: p.numero,
        descricao: p.descricao,
        valor: p.valor,
        vencimento: p.vencimento,
      })),
      obrigacoes: contrato.obrigacoes.map((o) => ({
        descricao: o.descricao,
        responsavel: o.responsavel,
        prazo: o.prazo,
      })),
      assinaturas: contrato.assinaturas.map((a) => ({
        nome: a.nome,
        email: a.email,
        papel: a.papel,
        status: a.status,
        assinadoEm: a.assinadoEm,
        ip: a.ip,
      })),
    });

    const filename = `contrato-${contrato.identificador ?? contrato.id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/contratos/[id]/pdf]", err);
    return NextResponse.json({ erro: "Erro ao gerar PDF." }, { status: 500 });
  }
}
