"use client";

import { useCallback, useEffect, useState } from "react";

// TODO: obter do contexto de autenticação
const escritorioId = "demo";

type CalendarioItem = {
  id: string;
  competencia: string;
  vencimento: string;
  status: "pendente" | "em_andamento" | "entregue" | "atrasada";
  cliente: { razaoSocial: string; cnpj: string };
  obrigacao: { nome: string; sigla: string; tipo: string };
  responsavel: { nome: string } | null;
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  entregue: "Entregue",
  atrasada: "Atrasada",
};

const statusBadgeClasses: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  em_andamento: "bg-blue-100 text-blue-700",
  entregue: "bg-green-100 text-green-700",
  atrasada: "bg-red-100 text-red-700",
};

const tipoBadgeClasses: Record<string, string> = {
  acessoria: "bg-purple-100 text-purple-700",
  imposto: "bg-orange-100 text-orange-700",
};

function formatDate(dateStr: string): string {
  // Append T12:00:00 for date-only strings to avoid timezone shift
  const normalized = dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr;
  const d = new Date(normalized);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCurrentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function CalendarioFiscalPage() {
  const [competencia, setCompetencia] = useState(getCurrentMonth);
  const [itens, setItens] = useState<CalendarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [populando, setPopulando] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const carregarCalendario = useCallback(async () => {
    setLoading(true);
    setMensagem(null);
    try {
      const res = await fetch(
        `/api/calendario-fiscal?escritorioId=${escritorioId}&competencia=${competencia}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao carregar calendário");
      setItens(data.itens ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMensagem({ tipo: "erro", texto: msg });
    } finally {
      setLoading(false);
    }
  }, [competencia]);

  useEffect(() => {
    carregarCalendario();
  }, [carregarCalendario]);

  async function gerarCalendario() {
    setGerando(true);
    setMensagem(null);
    try {
      const res = await fetch("/api/calendario-fiscal/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escritorioId, competencia }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao gerar calendário");
      setMensagem({
        tipo: "sucesso",
        texto: `Calendário gerado com sucesso! ${data.obrigacoesCriadas} obrigação(ões) criada(s).`,
      });
      await carregarCalendario();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMensagem({ tipo: "erro", texto: msg });
    } finally {
      setGerando(false);
    }
  }

  async function popularObrigacoesBase() {
    setPopulando(true);
    setMensagem(null);
    try {
      const res = await fetch("/api/obrigacoes-fiscais", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao popular obrigações");
      setMensagem({
        tipo: "sucesso",
        texto: `Obrigações base populadas! ${data.criadas ?? 0} criada(s).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMensagem({ tipo: "erro", texto: msg });
    } finally {
      setPopulando(false);
    }
  }

  async function alterarStatus(item: CalendarioItem, novoStatus: string) {
    try {
      const res = await fetch(`/api/calendario-fiscal/${item.cliente.cnpj ?? item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: novoStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao atualizar status");
      setItens((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: novoStatus as CalendarioItem["status"] } : i
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMensagem({ tipo: "erro", texto: msg });
    }
  }

  // --- Derived data ---

  const itensFiltrados = filtroCliente
    ? itens.filter((i) =>
        i.cliente.razaoSocial.toLowerCase().includes(filtroCliente.toLowerCase())
      )
    : itens;

  const resumo = {
    total: itens.length,
    pendentes: itens.filter((i) => i.status === "pendente").length,
    emAndamento: itens.filter((i) => i.status === "em_andamento").length,
    entregues: itens.filter((i) => i.status === "entregue").length,
    atrasadas: itens.filter((i) => i.status === "atrasada").length,
  };

  // Group by date
  const agrupadoPorData = itensFiltrados.reduce<Record<string, CalendarioItem[]>>((acc, item) => {
    const dataKey = formatDate(item.vencimento);
    if (!acc[dataKey]) acc[dataKey] = [];
    acc[dataKey].push(item);
    return acc;
  }, {});

  const datasOrdenadas = Object.keys(agrupadoPorData).sort((a, b) => {
    const [da, ma, ya] = a.split("/").map(Number);
    const [db, mb, yb] = b.split("/").map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  // --- Render ---

  const summaryCards = [
    { label: "Total de obrigações", value: resumo.total, color: "text-gray-900" },
    { label: "Pendentes", value: resumo.pendentes, color: "text-yellow-600" },
    { label: "Em andamento", value: resumo.emAndamento, color: "text-blue-600" },
    { label: "Entregues", value: resumo.entregues, color: "text-green-600" },
    { label: "Atrasadas", value: resumo.atrasadas, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendário Fiscal</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={gerarCalendario}
            disabled={gerando}
            className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {gerando ? "Gerando..." : "Gerar Calendário do Mês"}
          </button>
          <button
            onClick={popularObrigacoesBase}
            disabled={populando}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {populando ? "Populando..." : "Popular Obrigações Base"}
          </button>
        </div>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            mensagem.tipo === "sucesso"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter by client */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filtrar por cliente:</label>
        <input
          type="text"
          placeholder="Buscar razão social..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="border border-gray-200 rounded px-3 py-1.5 text-sm w-64"
        />
        {filtroCliente && (
          <button
            onClick={() => setFiltroCliente("")}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Carregando calendário fiscal...
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Nenhuma obrigação encontrada para {competencia}.
          <br />
          Clique em &quot;Gerar Calendário do Mês&quot; para criar as obrigações.
        </div>
      ) : (
        <div className="space-y-6">
          {datasOrdenadas.map((data) => (
            <div key={data}>
              <h2 className="mb-2 text-sm font-semibold text-gray-600">
                Vencimento: {data}
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          Obrigação
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          Vencimento
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          Responsável
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agrupadoPorData[data].map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {item.obrigacao.nome}
                            </div>
                            <div className="text-xs text-gray-400">
                              {item.obrigacao.sigla}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                tipoBadgeClasses[item.obrigacao.tipo] ??
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {item.obrigacao.tipo === "acessoria"
                                ? "Acessória"
                                : item.obrigacao.tipo === "imposto"
                                  ? "Imposto"
                                  : item.obrigacao.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.cliente.razaoSocial}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatDate(item.vencimento)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.status}
                              onChange={(e) => alterarStatus(item, e.target.value)}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer ${
                                statusBadgeClasses[item.status] ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="em_andamento">Em andamento</option>
                              <option value="entregue">Entregue</option>
                              <option value="atrasada">Atrasada</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {item.responsavel?.nome ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
