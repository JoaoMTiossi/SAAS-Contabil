import { gerarAlertasParaPrazo, gerarAlertasContrato, ContratoAlertas } from "@/lib/gerador-alertas";
import { addDays, startOfDay, subDays } from "date-fns";

describe("gerarAlertasParaPrazo", () => {
  const hoje = startOfDay(new Date());

  it("gera alertas de 30, 15, 7, 1 dia e no dia para vencimento futuro distante", () => {
    const vencimento = addDays(hoje, 60);
    const alertas = gerarAlertasParaPrazo({
      refTipo: "vencimento_geral",
      refDescricao: "Teste",
      dataVencimento: vencimento,
    });
    const antecedencias = alertas.map((a) => a.antecedenciaDias).sort((a, b) => b - a);
    expect(antecedencias).toContain(30);
    expect(antecedencias).toContain(15);
    expect(antecedencias).toContain(7);
    expect(antecedencias).toContain(1);
    expect(antecedencias).toContain(0);
  });

  it("não gera alerta de 30 dias quando faltam apenas 20 dias", () => {
    const vencimento = addDays(hoje, 20);
    const alertas = gerarAlertasParaPrazo({
      refTipo: "parcela",
      refDescricao: "Parcela 1",
      dataVencimento: vencimento,
    });
    const antecedencias = alertas.map((a) => a.antecedenciaDias);
    expect(antecedencias).not.toContain(30);
    expect(antecedencias).toContain(15);
    expect(antecedencias).toContain(7);
  });

  it("gera apenas alerta 'Atrasado' para vencimento passado", () => {
    const vencimento = subDays(hoje, 5);
    const alertas = gerarAlertasParaPrazo({
      refTipo: "parcela",
      refDescricao: "Parcela 2",
      dataVencimento: vencimento,
    });
    expect(alertas).toHaveLength(1);
    expect(alertas[0].antecedenciaDias).toBeLessThan(0);
    expect(alertas[0].prioridade).toBe("critico");
  });

  it("gera alerta 'Venceu hoje' quando antecedência é 0", () => {
    const alertas = gerarAlertasParaPrazo({
      refTipo: "obrigacao",
      refDescricao: "Entrega de relatório",
      dataVencimento: hoje,
    });
    const alertaHoje = alertas.find((a) => a.antecedenciaDias === 0);
    expect(alertaHoje).toBeDefined();
    expect(alertaHoje?.prioridade).toBe("critico");
  });

  it("prioridade correta para cada antecedência", () => {
    const vencimento = addDays(hoje, 60);
    const alertas = gerarAlertasParaPrazo({
      refTipo: "vencimento_geral",
      refDescricao: "Contrato",
      dataVencimento: vencimento,
    });
    const porAntecedencia = Object.fromEntries(
      alertas.map((a) => [a.antecedenciaDias, a.prioridade])
    );
    expect(porAntecedencia[30]).toBe("info");
    expect(porAntecedencia[15]).toBe("atencao");
    expect(porAntecedencia[7]).toBe("urgente");
    expect(porAntecedencia[1]).toBe("critico");
    expect(porAntecedencia[0]).toBe("critico");
  });

  it("usa canais padrão [email, dashboard] quando não especificado", () => {
    const alertas = gerarAlertasParaPrazo({
      refTipo: "vencimento_geral",
      refDescricao: "Contrato",
      dataVencimento: addDays(hoje, 40),
    });
    for (const a of alertas) {
      expect(a.canais).toContain("email");
      expect(a.canais).toContain("dashboard");
    }
  });

  it("associa parcelaId para refTipo 'parcela'", () => {
    const alertas = gerarAlertasParaPrazo({
      refTipo: "parcela",
      refDescricao: "Parcela 1",
      dataVencimento: addDays(hoje, 40),
      refId: "parcela-123",
    });
    for (const a of alertas) {
      expect(a.parcelaId).toBe("parcela-123");
      expect(a.obrigacaoId).toBeUndefined();
    }
  });

  it("associa obrigacaoId para refTipo 'obrigacao'", () => {
    const alertas = gerarAlertasParaPrazo({
      refTipo: "obrigacao",
      refDescricao: "Entrega",
      dataVencimento: addDays(hoje, 40),
      refId: "obrigacao-456",
    });
    for (const a of alertas) {
      expect(a.obrigacaoId).toBe("obrigacao-456");
      expect(a.parcelaId).toBeUndefined();
    }
  });
});

describe("gerarAlertasContrato", () => {
  const hoje = startOfDay(new Date());

  const contratoBase: ContratoAlertas = {
    contratoId: "ctrt-001",
    dataFim: addDays(hoje, 60),
    prazoAvisoCancelamento: addDays(hoje, 30),
    renovacaoAutomatica: true,
    parcelas: [
      { id: "p1", numero: 1, vencimento: addDays(hoje, 10), descricao: "Parcela 1" },
      { id: "p2", numero: 2, vencimento: addDays(hoje, 40), descricao: "Parcela 2" },
    ],
    obrigacoes: [
      { id: "o1", descricao: "Entrega de relatório", prazo: addDays(hoje, 20) },
    ],
  };

  it("gera alertas para todas as fontes do contrato", () => {
    const alertas = gerarAlertasContrato(contratoBase);
    const tiposCobertos = new Set(alertas.map((a) => a.refTipo));
    expect(tiposCobertos.has("vencimento_geral")).toBe(true);
    expect(tiposCobertos.has("renovacao")).toBe(true);
    expect(tiposCobertos.has("parcela")).toBe(true);
    expect(tiposCobertos.has("obrigacao")).toBe(true);
  });

  it("não gera alertas para parcelas sem data de vencimento", () => {
    const contrato: ContratoAlertas = {
      ...contratoBase,
      parcelas: [{ id: "p3", numero: 3, vencimento: null, descricao: "Parcela sem data" }],
    };
    const alertas = gerarAlertasContrato(contrato);
    const alertasParcela = alertas.filter((a) => a.refTipo === "parcela");
    expect(alertasParcela).toHaveLength(0);
  });

  it("não gera alertas para obrigações sem prazo", () => {
    const contrato: ContratoAlertas = {
      ...contratoBase,
      obrigacoes: [{ id: "o2", descricao: "Sem prazo", prazo: null }],
    };
    const alertas = gerarAlertasContrato(contrato);
    const alertasObrigacao = alertas.filter((a) => a.refTipo === "obrigacao");
    expect(alertasObrigacao).toHaveLength(0);
  });

  it("não gera alertas de vencimento quando dataFim é null", () => {
    const contrato: ContratoAlertas = {
      ...contratoBase,
      dataFim: null,
      prazoAvisoCancelamento: null,
      parcelas: [],
      obrigacoes: [],
    };
    const alertas = gerarAlertasContrato(contrato);
    expect(alertas).toHaveLength(0);
  });
});
