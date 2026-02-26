import { extrairPrazos } from "@/lib/extrator";

describe("extrairPrazos", () => {
  // ─── Datas numéricas ────────────────────────────────────────────

  it("extrai data de início no formato DD/MM/AAAA", () => {
    const texto = `
      CONTRATO DE PRESTAÇÃO DE SERVIÇOS
      Vigência a partir de 01/03/2025 até 28/02/2026.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.vencimento_geral.data_inicio).toBe("01/03/2025");
    expect(resultado.vencimento_geral.data_fim).toBe("28/02/2026");
  });

  it("extrai data por extenso", () => {
    const texto = `
      O presente instrumento inicia em 10 de janeiro de 2025
      e encerra em 10 de dezembro de 2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.vencimento_geral.data_inicio).toBe("10/01/2025");
    expect(resultado.vencimento_geral.data_fim).toBe("10/12/2025");
  });

  it("retorna null quando não há datas", () => {
    const texto = "Contrato de prestação de serviços entre partes.";
    const resultado = extrairPrazos(texto);
    expect(resultado.vencimento_geral.data_inicio).toBeNull();
    expect(resultado.vencimento_geral.data_fim).toBeNull();
    expect(resultado.confianca.vencimento_geral).toBe("baixa");
  });

  it("detecta renovação automática", () => {
    const texto = `
      O contrato será renovado automaticamente por igual período.
      Vigência: 01/01/2025 a 31/12/2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.vencimento_geral.renovacao_automatica).toBe(true);
  });

  it("detecta ausência de renovação automática", () => {
    const texto = `
      Não haverá renovação automática deste instrumento.
      Vigência: 01/01/2025 a 31/12/2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.vencimento_geral.renovacao_automatica).toBe(false);
  });

  it("retorna null para renovação quando não mencionada", () => {
    const texto = `
      Contrato entre as partes. Vigência: 01/01/2025 a 31/12/2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.vencimento_geral.renovacao_automatica).toBeNull();
  });

  // ─── Parcelas ────────────────────────────────────────────────────

  it("extrai parcelas explícitas", () => {
    const texto = `
      PAGAMENTO
      Parcela 1: R$ 1.500,00 vencimento 10/01/2025
      Parcela 2: R$ 1.500,00 vencimento 10/02/2025
      Parcela 3: R$ 1.500,00 vencimento 10/03/2025
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.parcelas).toHaveLength(3);
    expect(resultado.parcelas[0].vencimento).toBe("10/01/2025");
    expect(resultado.parcelas[1].vencimento).toBe("10/02/2025");
    expect(resultado.confianca.parcelas).toBe("alta");
  });

  it("detecta quantidade de parcelas sem datas explícitas", () => {
    const texto = `
      O valor total será pago em 6 parcelas mensais de R$ 500,00.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.parcelas).toHaveLength(6);
    expect(resultado.confianca.parcelas).toBe("media");
  });

  it("retorna array vazio quando não há parcelas", () => {
    const texto = "Serviços prestados por valor fixo mensal.";
    const resultado = extrairPrazos(texto);
    expect(resultado.parcelas).toHaveLength(0);
    expect(resultado.confianca.parcelas).toBe("baixa");
  });

  // ─── Obrigações ──────────────────────────────────────────────────

  it("extrai obrigações com prazo", () => {
    const texto = `
      A contratada deverá entregar o relatório até 15/06/2025.
      O contratante deverá fornecer os documentos até 01/04/2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.obrigacoes.length).toBeGreaterThan(0);
    const obrigacaoContratada = resultado.obrigacoes.find((o) =>
      o.descricao.includes("relatório")
    );
    if (obrigacaoContratada) {
      expect(obrigacaoContratada.prazo).toBe("15/06/2025");
      expect(obrigacaoContratada.responsavel).toBe("contratado");
    }
  });

  // ─── Identificação ───────────────────────────────────────────────

  it("extrai identificador do contrato", () => {
    const texto = `
      CONTRATO N° 2025/001
      Vigência: 01/01/2025 a 31/12/2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.contrato.identificador).toBeTruthy();
  });

  it("extrai nomes das partes", () => {
    const texto = `
      CONTRATANTE: Empresa ABC Ltda.
      CONTRATADO: João Silva.
      Vigência: 01/01/2025 a 31/12/2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.contrato.partes.contratante).toContain("Empresa ABC");
    expect(resultado.contrato.partes.contratado).toContain("João Silva");
  });

  // ─── Confiança ───────────────────────────────────────────────────

  it("retorna confiança alta quando datas são explícitas com contexto", () => {
    const texto = `
      Vigência a partir de 01/01/2025 até 31/12/2025.
    `;
    const resultado = extrairPrazos(texto);
    expect(resultado.confianca.vencimento_geral).toBe("alta");
  });

  it("retorna JSON válido sempre, mesmo com texto inválido", () => {
    const resultado = extrairPrazos("lorem ipsum dolor sit amet");
    expect(resultado).toHaveProperty("contrato");
    expect(resultado).toHaveProperty("vencimento_geral");
    expect(resultado).toHaveProperty("parcelas");
    expect(resultado).toHaveProperty("obrigacoes");
    expect(resultado).toHaveProperty("confianca");
    // Nunca inventa dados
    expect(resultado.vencimento_geral.data_inicio).toBeNull();
    expect(resultado.vencimento_geral.data_fim).toBeNull();
  });

  it("todos os status das parcelas extraídas são 'pendente'", () => {
    const texto = `
      Parcela 1: R$ 500,00 vencimento 10/01/2025
      Parcela 2: R$ 500,00 vencimento 10/02/2025
    `;
    const resultado = extrairPrazos(texto);
    for (const p of resultado.parcelas) {
      expect(p.status).toBe("pendente");
    }
  });

  it("todos os status das obrigações extraídas são 'pendente'", () => {
    const texto = `
      O contratante deverá entregar os documentos até 01/04/2025.
    `;
    const resultado = extrairPrazos(texto);
    for (const o of resultado.obrigacoes) {
      expect(o.status).toBe("pendente");
    }
  });
});
