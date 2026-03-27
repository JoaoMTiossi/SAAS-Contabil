import PDFDocument from "pdfkit";

interface ContratoParaPDF {
  identificador: string | null;
  contratante: string | null;
  contratado: string | null;
  dataInicio: Date | string | null;
  dataFim: Date | string | null;
  status: string;
  textoOriginal: string | null;
  parcelas: Array<{
    numero: number;
    descricao: string | null;
    valor: unknown;
    vencimento: Date | string | null;
  }>;
  obrigacoes: Array<{
    descricao: string;
    responsavel: string | null;
    prazo: Date | string | null;
  }>;
  assinaturas?: Array<{
    nome: string;
    email: string;
    papel: string;
    status: string;
    assinadoEm: Date | string | null;
    ip: string | null;
  }>;
}

function formatDate(d: Date | string | null): string {
  if (!d) return "\u2014";
  const date = typeof d === "string" ? new Date(d) : new Date(d);
  if (isNaN(date.getTime())) return "\u2014";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatBRL(v: unknown): string {
  const num = Number(v);
  if (isNaN(num)) return "R$ 0,00";
  const parts = num.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${intPart},${parts[1]}`;
}

export function gerarPDFContrato(contrato: ContratoParaPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
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
      doc.text(`Contratante: ${contrato.contratante ?? "\u2014"}`);
      doc.text(`Contratado: ${contrato.contratado ?? "\u2014"}`);
      doc.moveDown(0.5);

      // Dates
      doc.font("Helvetica-Bold").fontSize(12).text("VIG\u00CANCIA");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");
      doc.text(`In\u00edcio: ${formatDate(contrato.dataInicio)}`);
      doc.text(`T\u00e9rmino: ${formatDate(contrato.dataFim)}`);
      doc.text(`Status: ${contrato.status}`);
      doc.moveDown(0.5);

      // Contract text
      if (contrato.textoOriginal) {
        doc.font("Helvetica-Bold").fontSize(12).text("CONTE\u00daDO DO CONTRATO");
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
            `${p.numero}. ${p.descricao ?? "Parcela"} \u2014 ${formatBRL(p.valor)} \u2014 Venc.: ${formatDate(p.vencimento)}`
          );
        }
        doc.moveDown(0.5);
      }

      // Obrigacoes
      if (contrato.obrigacoes.length > 0) {
        doc.font("Helvetica-Bold").fontSize(12).text("OBRIGA\u00c7\u00d5ES");
        doc.moveDown(0.3);
        doc.fontSize(9).font("Helvetica");
        for (const o of contrato.obrigacoes) {
          doc.text(
            `- ${o.descricao} \u2014 Resp.: ${o.responsavel ?? "\u2014"} \u2014 Prazo: ${formatDate(o.prazo)}`
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
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      doc.fontSize(7).font("Helvetica").fillColor("gray");
      doc.text(
        `Documento gerado automaticamente em ${timestamp} \u2014 SAAS-Contabil`,
        { align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
