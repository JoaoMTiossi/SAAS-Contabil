import PDFDocument from "pdfkit";

interface ContratoParaPDF {
  identificador: string | null;
  contratante: string | null;
  contratado: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: string;
  textoOriginal: string | null;
  parcelas: Array<{
    numero: number;
    descricao: string | null;
    valor: unknown;
    vencimento: Date | null;
  }>;
  obrigacoes: Array<{
    descricao: string;
    responsavel: string | null;
    prazo: Date | null;
  }>;
  assinaturas?: Array<{
    nome: string;
    email: string;
    papel: string;
    status: string;
    assinadoEm: Date | null;
    ip: string | null;
  }>;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatBRL(v: unknown): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function gerarPDFContrato(contrato: ContratoParaPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text("CONTRATO", { align: "center" });
    doc.moveDown(0.5);
    if (contrato.identificador) {
      doc.fontSize(12).font("Helvetica").text(contrato.identificador, { align: "center" });
    }
    doc.moveDown(1);

    // Line separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Parties
    doc.fontSize(12).font("Helvetica-Bold").text("PARTES");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Contratante: ${contrato.contratante ?? "—"}`);
    doc.text(`Contratado: ${contrato.contratado ?? "—"}`);
    doc.moveDown(0.5);

    // Dates
    doc.font("Helvetica-Bold").fontSize(12).text("VIGÊNCIA");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Início: ${formatDate(contrato.dataInicio)}`);
    doc.text(`Término: ${formatDate(contrato.dataFim)}`);
    doc.text(`Status: ${contrato.status}`);
    doc.moveDown(0.5);

    // Contract text
    if (contrato.textoOriginal) {
      doc.font("Helvetica-Bold").fontSize(12).text("CONTEÚDO DO CONTRATO");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica");
      const texto = contrato.textoOriginal.substring(0, 8000);
      doc.text(texto, { align: "justify", lineGap: 2 });
      if (contrato.textoOriginal.length > 8000) {
        doc.text("... [texto truncado]");
      }
      doc.moveDown(0.5);
    }

    // Parcelas
    if (contrato.parcelas.length > 0) {
      doc.addPage();
      doc.font("Helvetica-Bold").fontSize(12).text("PARCELAS");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica");
      for (const p of contrato.parcelas) {
        doc.text(
          `${p.numero}. ${p.descricao ?? "Parcela"} — ${formatBRL(p.valor)} — Venc.: ${formatDate(p.vencimento)}`
        );
      }
      doc.moveDown(0.5);
    }

    // Obrigações
    if (contrato.obrigacoes.length > 0) {
      doc.font("Helvetica-Bold").fontSize(12).text("OBRIGAÇÕES");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica");
      for (const o of contrato.obrigacoes) {
        doc.text(
          `• ${o.descricao} — Resp.: ${o.responsavel ?? "—"} — Prazo: ${formatDate(o.prazo)}`
        );
      }
      doc.moveDown(0.5);
    }

    // Signatures certificate
    if (contrato.assinaturas && contrato.assinaturas.length > 0) {
      doc.addPage();
      doc.font("Helvetica-Bold").fontSize(14).text("CERTIFICADO DE ASSINATURA", { align: "center" });
      doc.moveDown(1);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font("Helvetica");
      doc.text("Este documento foi assinado eletronicamente conforme Lei 14.063/2020.");
      doc.moveDown(0.5);

      for (const a of contrato.assinaturas) {
        doc.font("Helvetica-Bold").text(`${a.nome} (${a.papel})`);
        doc.font("Helvetica");
        doc.text(`Email: ${a.email}`);
        doc.text(`Status: ${a.status}`);
        if (a.assinadoEm) {
          doc.text(`Assinado em: ${formatDate(a.assinadoEm)}`);
        }
        if (a.ip) {
          doc.text(`IP: ${a.ip}`);
        }
        doc.moveDown(0.5);
      }
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(7).font("Helvetica").fillColor("gray");
    doc.text(
      `Documento gerado automaticamente em ${new Date().toLocaleString("pt-BR")} — SAAS-Contabil`,
      { align: "center" }
    );

    doc.end();
  });
}
