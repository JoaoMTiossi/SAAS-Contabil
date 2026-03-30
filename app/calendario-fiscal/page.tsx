"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

type CalendarioItem = {
  id: string;
  competencia: string;
  vencimento: string;
  status: "pendente" | "em_andamento" | "entregue" | "atrasada";
  cliente: { razaoSocial: string; cnpj: string };
  obrigacao: { nome: string; sigla: string; tipo: string };
  responsavel: { nome: string } | null;
};

type ViewMode = "lista" | "calendario";

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
  const { escritorioId } = useAuth();
  const [competencia, setCompetencia] = useState(getCurrentMonth);
  const [itens, setItens] = useState<CalendarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [populando, setPopulando] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
  }, [competencia, escritorioId]);

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

  // --- Calendar grid helpers ---

  const statusDotClasses: Record<string, string> = {
    pendente: "bg-yellow-400",
    em_andamento: "bg-blue-400",
    entregue: "bg-green-400",
    atrasada: "bg-red-400",
  };

  const statusPillClasses: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
    entregue: "bg-green-100 text-green-800 border-green-200",
    atrasada: "bg-red-100 text-red-800 border-red-200",
  };

  const calendarData = useMemo(() => {
    const [yearStr, monthStr] = competencia.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr); // 1-indexed

    const firstDay = new Date(year, month - 1, 1);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();

    // Map day number -> items
    const dayMap: Record<number, CalendarioItem[]> = {};
    for (const item of itensFiltrados) {
      const dateStr = item.vencimento.length === 10 ? `${item.vencimento}T12:00:00` : item.vencimento;
      const d = new Date(dateStr);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const day = d.getDate();
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(item);
      }
    }

    return { year, month, startDow, daysInMonth, dayMap };
  }, [competencia, itensFiltrados]);

  const selectedDayItems = selectedDay ? calendarData.dayMap[selectedDay] ?? [] : [];

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

      {/* Filter + View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setViewMode("lista")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "lista"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setViewMode("calendario")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "calendario"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Calend&aacute;rio
          </button>
        </div>
      </div>

      {/* Content */}
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
      ) : viewMode === "lista" ? (
        /* ===== LIST VIEW ===== */
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
      ) : (
        /* ===== CALENDAR VIEW ===== */
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div
                key={d}
                className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells before the 1st */}
            {Array.from({ length: calendarData.startDow }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayItems = calendarData.dayMap[day] ?? [];
              const isToday =
                new Date().getFullYear() === calendarData.year &&
                new Date().getMonth() + 1 === calendarData.month &&
                new Date().getDate() === day;
              const hasItems = dayItems.length > 0;
              const isWeekend = (calendarData.startDow + i) % 7 === 0 || (calendarData.startDow + i) % 7 === 6;

              return (
                <div
                  key={day}
                  onClick={() => hasItems && setSelectedDay(day)}
                  className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 transition-colors ${
                    hasItems ? "cursor-pointer hover:bg-blue-50/50" : ""
                  } ${isWeekend ? "bg-gray-50/30" : ""}`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-blue-600 text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {day}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Obligation pills */}
                  <div className="flex flex-col gap-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${
                          statusPillClasses[item.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                        title={`${item.obrigacao.nome} - ${item.cliente.razaoSocial} (${statusLabels[item.status]})`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            statusDotClasses[item.status] ?? "bg-gray-400"
                          }`}
                        />
                        <span className="truncate">{item.obrigacao.sigla}</span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-gray-400 pl-1">
                        +{dayItems.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty cells after the last day */}
            {(() => {
              const trailing = (calendarData.startDow + calendarData.daysInMonth) % 7;
              return trailing > 0
                ? Array.from({ length: 7 - trailing }).map((_, i) => (
                    <div
                      key={`trailing-${i}`}
                      className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50"
                    />
                  ))
                : null;
            })()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">Legenda:</span>
            {[
              { label: "Pendente", cls: "bg-yellow-400" },
              { label: "Em andamento", cls: "bg-blue-400" },
              { label: "Entregue", cls: "bg-green-400" },
              { label: "Atrasada", cls: "bg-red-400" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${l.cls}`} />
                <span className="text-xs text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== DAY DETAIL MODAL ===== */}
      {selectedDay !== null && selectedDayItems.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {String(selectedDay).padStart(2, "0")}/{String(calendarData.month).padStart(2, "0")}/{calendarData.year}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({selectedDayItems.length} obrigaç{selectedDayItems.length === 1 ? "ão" : "ões"})
                </span>
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto max-h-[60vh] divide-y divide-gray-100">
              {selectedDayItems.map((item) => (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {item.obrigacao.nome}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">
                          {item.obrigacao.sigla}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            tipoBadgeClasses[item.obrigacao.tipo] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.obrigacao.tipo === "acessoria"
                            ? "Acessória"
                            : item.obrigacao.tipo === "imposto"
                              ? "Imposto"
                              : item.obrigacao.tipo}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 truncate">
                        {item.cliente.razaoSocial}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.cliente.cnpj}
                        {item.responsavel ? ` | Resp: ${item.responsavel.nome}` : ""}
                      </p>
                    </div>
                    <select
                      value={item.status}
                      onChange={(e) => alterarStatus(item, e.target.value)}
                      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer ${
                        statusBadgeClasses[item.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="entregue">Entregue</option>
                      <option value="atrasada">Atrasada</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
