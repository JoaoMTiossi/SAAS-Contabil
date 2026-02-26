/**
 * Extrator de prazos e vencimentos de contratos
 * Usa Regex + NLP clássico para detectar datas, valores e obrigações.
 */

import { ContratoExtraido, NivelConfianca } from "@/types/contrato";

// ─────────────────────────────────────────────
// Padrões de data
// ─────────────────────────────────────────────

// DD/MM/AAAA ou DD-MM-AAAA
const REGEX_DATA_NUMERICA =
  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g;

// DD de MMMM de AAAA (ex: 15 de março de 2025)
const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const REGEX_DATA_EXTENSO =
  /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/gi;

// Valor monetário: R$ 1.000,00 ou R$1000,00
const REGEX_VALOR =
  /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/gi;

// Parcelas: "12 parcelas", "em 6x", "dividido em 3 parcelas"
const REGEX_PARCELAS =
  /\b(?:em\s+)?(\d+)\s*(?:parcelas?|prestações?|x)\b/i;

// ─────────────────────────────────────────────
// Palavras-chave para contexto
// ─────────────────────────────────────────────

const KW_INICIO = [
  "início",
  "inicio",
  "vigência",
  "vigencia",
  "a partir",
  "começa",
  "inicia",
  "data de início",
  "data de inicio",
  "assinatura",
];

const KW_FIM = [
  "término",
  "termino",
  "vencimento",
  "vence",
  "expira",
  "encerramento",
  "encerra",
  "termina",
  "data de término",
  "data de termino",
  "prazo final",
  "válido até",
  "valido ate",
  "até",
  "ate",
];

const KW_RENOVACAO = [
  "renovação automática",
  "renovacao automatica",
  "renova automaticamente",
  "renovado automaticamente",
  "prorrogação automática",
  "prorrogacao automatica",
];

const KW_NAO_RENOVACAO = [
  "não renovação",
  "nao renovacao",
  "aviso de não renovação",
  "aviso de nao renovacao",
  "não pretende renovar",
  "rescisão",
  "rescisao",
];

const KW_CONTRATANTE = [
  "contratante",
  "cliente",
  "tomador",
  "parte contratante",
];

const KW_CONTRATADO = [
  "contratada",
  "contratado",
  "prestador",
  "fornecedor",
  "empresa contratada",
];

const KW_PARCELA = [
  "parcela",
  "prestação",
  "prestacao",
  "pagamento",
  "mensalidade",
  "vencimento",
];

const KW_OBRIGACAO = [
  "deverá",
  "devera",
  "obriga",
  "comprometer",
  "responsável",
  "responsavel",
  "entregue",
  "prazo de entrega",
  "entrega",
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Normaliza string removendo acentos para comparação */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Formata Date para DD/MM/AAAA */
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Verifica se a data é válida */
function isValidDate(d: Date): boolean {
  return !isNaN(d.getTime());
}

/** Extrai todas as datas (numéricas e por extenso) de um texto */
function extrairTodasDatas(texto: string): Array<{ data: Date; indice: number; raw: string }> {
  const resultados: Array<{ data: Date; indice: number; raw: string }> = [];

  // Numéricas
  let match: RegExpExecArray | null;
  const regexNum = new RegExp(REGEX_DATA_NUMERICA.source, "g");
  while ((match = regexNum.exec(texto)) !== null) {
    const [raw, d, m, y] = match;
    const data = new Date(Number(y), Number(m) - 1, Number(d));
    if (isValidDate(data) && data.getFullYear() === Number(y)) {
      resultados.push({ data, indice: match.index, raw });
    }
  }

  // Por extenso
  const regexExt = new RegExp(REGEX_DATA_EXTENSO.source, "gi");
  while ((match = regexExt.exec(texto)) !== null) {
    const [raw, d, mesStr, y] = match;
    const mes = MESES[normalize(mesStr)];
    if (mes) {
      const data = new Date(Number(y), mes - 1, Number(d));
      if (isValidDate(data)) {
        resultados.push({ data, indice: match.index, raw });
      }
    }
  }

  return resultados.sort((a, b) => a.indice - b.indice);
}

/** Encontra a data mais próxima de uma posição com palavras-chave */
function encontrarDataComContexto(
  texto: string,
  todasDatas: Array<{ data: Date; indice: number; raw: string }>,
  palavrasChave: string[],
  janelaChars = 200,
  lookBehindChars = 50
): { data: Date | null; confianca: NivelConfianca } {
  const textoNorm = normalize(texto);

  for (const kw of palavrasChave) {
    const kwNorm = normalize(kw);
    let pos = textoNorm.indexOf(kwNorm);
    while (pos !== -1) {
      // Procura data dentro da janela ao redor da palavra-chave
      const janela = {
        inicio: Math.max(0, pos - lookBehindChars),
        fim: pos + kw.length + janelaChars,
      };
      const dataProxima = todasDatas.find(
        (d) => d.indice >= janela.inicio && d.indice <= janela.fim
      );
      if (dataProxima) {
        return { data: dataProxima.data, confianca: "alta" };
      }
      pos = textoNorm.indexOf(kwNorm, pos + 1);
    }
  }

  return { data: null, confianca: "baixa" };
}

/** Extrai nome da parte (contratante/contratado) */
function extrairNomeParte(texto: string, palavrasChave: string[]): string | null {
  for (const kw of palavrasChave) {
    const regex = new RegExp(
      `(?:${kw})\\s*[:\\-–]?\\s*([A-ZÀ-Ú][a-zA-ZÀ-ú\\s]{2,60}?)(?=[,;\\.\\n])`,
      "i"
    );
    const match = texto.match(regex);
    if (match) return match[1].trim();
  }
  return null;
}

/** Extrai identificador do contrato */
function extrairIdentificador(texto: string): string | null {
  const regex =
    /(?:contrato|instrumento|acordo)\s*(?:n[º°]?|número|numero)?\s*[:\-–]?\s*([\w\-\/\.]{2,30})/i;
  const match = texto.match(regex);
  return match ? match[1].trim() : null;
}

/** Verifica renovação automática */
function detectarRenovacaoAutomatica(texto: string): boolean | null {
  const textoNorm = normalize(texto);

  // Verifica negação ANTES do positivo para não confundir "não haverá renovação automática"
  const temNegacao =
    /n[aã]o\s+(?:haver[aá]\s+)?renova[cç][aã]o\s+autom[aá]tica|n[aã]o\s+ser[aá]\s+renovado\s+automaticamente/i.test(
      texto
    );
  if (temNegacao) return false;

  const temRenovacao = KW_RENOVACAO.some((kw) =>
    textoNorm.includes(normalize(kw))
  );
  if (temRenovacao) return true;

  return null;
}

/** Extrai prazo limite para aviso de cancelamento */
function extrairPrazoAvisoCancelamento(
  texto: string,
  todasDatas: Array<{ data: Date; indice: number; raw: string }>
): { data: Date | null; confianca: NivelConfianca } {
  // Padrão: "X dias antes" do vencimento
  const regexDias =
    /(\d+)\s*dias?\s*(?:de\s+)?(?:ant(?:es|ecedência|ecedencia)|prior)\s*(?:ao\s+vencimento|ao\s+término|ao\s+termino)?/i;
  const match = texto.match(regexDias);
  if (match) {
    // Retorna como inferido (media) - precisa de data base para calcular
    return { data: null, confianca: "media" };
  }

  return encontrarDataComContexto(texto, todasDatas, KW_NAO_RENOVACAO);
}

// ─────────────────────────────────────────────
// Extração de Parcelas
// ─────────────────────────────────────────────

interface ParcelaRaw {
  numero: number;
  descricao: string | null;
  valor: string | null;
  vencimento: string | null;
}

function extrairParcelas(texto: string): {
  parcelas: ParcelaRaw[];
  confianca: NivelConfianca;
} {
  const parcelas: ParcelaRaw[] = [];
  const todasDatas = extrairTodasDatas(texto);
  const valores: string[] = [];
  let match: RegExpExecArray | null;

  // Coleta todos os valores
  const regexVal = new RegExp(REGEX_VALOR.source, "gi");
  while ((match = regexVal.exec(texto)) !== null) {
    valores.push(`R$ ${match[1]}`);
  }

  // Detecta quantidade de parcelas
  const matchQtd = texto.match(REGEX_PARCELAS);
  const qtdParcelas = matchQtd ? parseInt(matchQtd[1]) : null;

  // Padrão explícito: "Parcela 1: R$ 500,00 – vencimento 10/01/2025"
  const regexParcelaExplicita =
    /parcela\s+(\d+)[:\s\-–]*(?:R\$\s*([\d.,]+))?[^.]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi;

  while ((match = regexParcelaExplicita.exec(texto)) !== null) {
    const [, num, val, dataStr] = match;
    const [d, m, y] = dataStr.split(/[\/\-]/);
    const data = new Date(Number(y), Number(m) - 1, Number(d));
    parcelas.push({
      numero: parseInt(num),
      descricao: `Parcela ${num}`,
      valor: val ? `R$ ${val}` : (valores[parseInt(num) - 1] ?? null),
      vencimento: isValidDate(data) ? formatDate(data) : null,
    });
  }

  // Se não encontrou parcelas explícitas, mas tem qtd + valor total
  if (parcelas.length === 0 && qtdParcelas && valores.length > 0) {
    // Tenta distribuir datas por vencimento mensal
    const dataReferencia = todasDatas.find((d) =>
      encontrarDataComContexto(texto, [d], KW_FIM).confianca !== "baixa"
    );

    for (let i = 1; i <= qtdParcelas; i++) {
      parcelas.push({
        numero: i,
        descricao: `Parcela ${i} de ${qtdParcelas}`,
        valor: valores[0] ?? null,
        vencimento: null, // será revisado pelo usuário
      });
    }
  }

  const confianca: NivelConfianca =
    parcelas.length === 0
      ? "baixa"
      : parcelas.some((p) => p.vencimento)
      ? "alta"
      : "media";

  return { parcelas, confianca };
}

// ─────────────────────────────────────────────
// Extração de Obrigações
// ─────────────────────────────────────────────

interface ObrigacaoRaw {
  descricao: string;
  responsavel: "contratante" | "contratado" | null;
  prazo: string | null;
}

function extrairObrigacoes(texto: string): {
  obrigacoes: ObrigacaoRaw[];
  confianca: NivelConfianca;
} {
  const obrigacoes: ObrigacaoRaw[] = [];
  const todasDatas = extrairTodasDatas(texto);

  // Divide em sentenças
  const sentencas = texto
    .split(/[.;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  for (const sentenca of sentencas) {
    const sentNorm = normalize(sentenca);
    const ehObrigacao = KW_OBRIGACAO.some((kw) =>
      sentNorm.includes(normalize(kw))
    );

    if (!ehObrigacao) continue;

    // Determina responsável
    let responsavel: "contratante" | "contratado" | null = null;
    if (KW_CONTRATANTE.some((kw) => sentNorm.includes(normalize(kw)))) {
      responsavel = "contratante";
    } else if (KW_CONTRATADO.some((kw) => sentNorm.includes(normalize(kw)))) {
      responsavel = "contratado";
    }

    // Procura data na sentença
    const inicioSentenca = texto.indexOf(sentenca);
    const datasSentenca = todasDatas.filter(
      (d) =>
        d.indice >= inicioSentenca &&
        d.indice <= inicioSentenca + sentenca.length
    );

    const prazo =
      datasSentenca.length > 0 ? formatDate(datasSentenca[0].data) : null;

    // Limita descrição a 200 chars
    const descricao = sentenca.substring(0, 200);

    obrigacoes.push({ descricao, responsavel, prazo });
  }

  const confianca: NivelConfianca =
    obrigacoes.length === 0
      ? "baixa"
      : obrigacoes.some((o) => o.prazo)
      ? "alta"
      : "media";

  return { obrigacoes, confianca };
}

// ─────────────────────────────────────────────
// Função principal: extrairPrazos
// ─────────────────────────────────────────────

export function extrairPrazos(textoContrato: string): ContratoExtraido {
  const todasDatas = extrairTodasDatas(textoContrato);

  // Partes
  const contratante = extrairNomeParte(textoContrato, KW_CONTRATANTE);
  const contratado = extrairNomeParte(textoContrato, KW_CONTRATADO);

  // Identificador
  const identificador = extrairIdentificador(textoContrato);

  // Datas de início e fim
  const { data: dataInicio, confianca: confInicio } =
    encontrarDataComContexto(textoContrato, todasDatas, KW_INICIO);

  // lookBehindChars=0 para não capturar a data de início que precede "até"
  const { data: dataFim, confianca: confFim } = encontrarDataComContexto(
    textoContrato,
    todasDatas,
    KW_FIM,
    200,
    0
  );

  // Renovação automática
  const renovacaoAutomatica = detectarRenovacaoAutomatica(textoContrato);

  // Prazo aviso cancelamento
  const { data: prazoAviso } = extrairPrazoAvisoCancelamento(
    textoContrato,
    todasDatas
  );

  // Confiança do vencimento geral
  const confiancaVencimento: NivelConfianca =
    confInicio === "alta" || confFim === "alta"
      ? "alta"
      : confInicio === "media" || confFim === "media"
      ? "media"
      : "baixa";

  // Parcelas
  const { parcelas: parcelasRaw, confianca: confiancaParcelas } =
    extrairParcelas(textoContrato);

  // Obrigações
  const { obrigacoes: obrigacoesRaw, confianca: confiancaObrigacoes } =
    extrairObrigacoes(textoContrato);

  return {
    contrato: {
      identificador: identificador ?? null,
      partes: {
        contratante: contratante ?? null,
        contratado: contratado ?? null,
      },
    },
    vencimento_geral: {
      data_inicio: dataInicio ? formatDate(dataInicio) : null,
      data_fim: dataFim ? formatDate(dataFim) : null,
      renovacao_automatica: renovacaoAutomatica,
      prazo_aviso_cancelamento: prazoAviso ? formatDate(prazoAviso) : null,
    },
    parcelas: parcelasRaw.map((p) => ({
      numero: p.numero,
      descricao: p.descricao ?? null,
      valor: p.valor ?? null,
      vencimento: p.vencimento ?? null,
      status: "pendente" as const,
    })),
    obrigacoes: obrigacoesRaw.map((o) => ({
      descricao: o.descricao,
      responsavel: o.responsavel,
      prazo: o.prazo ?? null,
      status: "pendente" as const,
    })),
    confianca: {
      vencimento_geral: confiancaVencimento,
      parcelas: confiancaParcelas,
      obrigacoes: confiancaObrigacoes,
    },
  };
}

// ─────────────────────────────────────────────
// Utilitário: parse de arquivo .docx
// ─────────────────────────────────────────────

export async function extrairTextoDe(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
