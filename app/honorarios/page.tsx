"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import Pagination from "@/components/Pagination";

/* ── Types ─────────────────────────────────────────────────── */

interface Honorario {
  id: string;
  clienteId: string;
  valor: number | string;
  periodicidade: string;
  diaVencimento: number;
  ativo: boolean;
  cliente: { razaoSocial: string };
  _count: { lancamentos: number };
  lancamentos?: Lancamento[];
}

interface Lancamento {
  id: string;
  honorarioId: string;
  competencia: string;
  valor: number | string;
  vencimento: string;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  dataPagamento: string | null;
  valorPago: number | string | null;
  observacao: string | null;
  honorario?: {
    cliente: { razaoSocial: string };
  };
}

interface Cliente {
  id: string;
  razaoSocial: string;
}

/* ── Status badge helper ───────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  pago: "bg-green-100 text-green-700",
  pendente: "bg-yellow-100 text-yellow-700",
  atrasado: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
  ativo: "bg-blue-100 text-blue-700",
  inativo: "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {status}
    </span>
  );
}

function formatBRL(v: number | string) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* ── Component ─────────────────────────────────────────────── */

export default function HonorariosPage() {
  const { escritorioId } = useAuth();
  const [honorarios, setHonorarios] = useState<Honorario[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  /* Form state */
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clienteId: "",
    valor: "",
    diaVencimento: "10",
    periodicidade: "mensal",
  });
  const [salvando, setSalvando] = useState(false);
  const [paginaHon, setPaginaHon] = useState(1);
  const [paginaLanc, setPaginaLanc] = useState(1);
  const porPagina = 15;

  /* Email state */
  const [emailLancId, setEmailLancId] = useState<string | null>(null);
  const [emailDest, setEmailDest] = useState("");
  const [emailAssunto, setEmailAssunto] = useState("");
  const [emailCorpo, setEmailCorpo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  /* ── Fetch data ──────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/honorarios?escritorioId=${escritorioId}`);
      if (!res.ok) throw new Error("Erro ao carregar honorários");
      const data = await res.json();
      setHonorarios(data.honorarios ?? []);

      // Extract lancamentos from honorarios (pendente + atrasado)
      const allLanc: Lancamento[] = [];
      for (const h of data.honorarios ?? []) {
        if (h.lancamentos) {
          for (const l of h.lancamentos) {
            if (l.status === "pendente" || l.status === "atrasado") {
              allLanc.push({ ...l, honorario: { cliente: h.cliente } });
            }
          }
        }
      }
      setLancamentos(allLanc);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [escritorioId]);

  const fetchClientes = useCallback(async () => {
    try {
      const res = await fetch(`/api/clientes?escritorioId=${escritorioId}`);
      if (!res.ok) return;
      const data = await res.json();
      setClientes(
        (data.clientes ?? []).map((c: { id: string; razaoSocial: string }) => ({
          id: c.id,
          razaoSocial: c.razaoSocial,
        }))
      );
    } catch {
      // Fallback: extract clients from honorarios
      try {
        const res = await fetch(`/api/honorarios?escritorioId=${escritorioId}`);
        if (!res.ok) return;
        const data = await res.json();
        const clienteMap = new Map<string, string>();
        for (const h of data.honorarios ?? []) {
          clienteMap.set(h.clienteId, h.cliente?.razaoSocial ?? "Cliente");
        }
        setClientes(
          Array.from(clienteMap.entries()).map(([id, razaoSocial]) => ({
            id,
            razaoSocial,
          }))
        );
      } catch {
        // silently fail
      }
    }
  }, [escritorioId]);

  useEffect(() => {
    if (escritorioId) {
      fetchData();
      fetchClientes();
    }
  }, [fetchData, fetchClientes, escritorioId]);

  /* ── Gerar lançamentos ───────────────────────────────────── */

  async function handleGerarLancamentos() {
    setGerando(true);
    setErro(null);
    setSucesso(null);
    try {
      const res = await fetch("/api/honorarios/gerar-lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escritorioId }),
      });
      if (!res.ok) throw new Error("Erro ao gerar lançamentos");
      const data = await res.json();
      setSucesso(`${data.lancamentosCriados} lançamento(s) criado(s) com sucesso.`);
      fetchData();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setGerando(false);
    }
  }

  /* ── Registrar pagamento ─────────────────────────────────── */

  async function handlePagar(lancamento: Lancamento) {
    setPagandoId(lancamento.id);
    setErro(null);
    setSucesso(null);
    try {
      const res = await fetch(`/api/honorarios/lancamentos/${lancamento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataPagamento: new Date().toISOString(),
          valorPago: Number(lancamento.valor),
        }),
      });
      if (!res.ok) throw new Error("Erro ao registrar pagamento");
      setSucesso("Pagamento registrado com sucesso.");
      fetchData();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setPagandoId(null);
    }
  }

  /* ── Criar honorário ─────────────────────────────────────── */

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const res = await fetch("/api/honorarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: formData.clienteId,
          valor: parseFloat(formData.valor),
          diaVencimento: parseInt(formData.diaVencimento, 10),
          periodicidade: formData.periodicidade,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.erro ?? "Erro ao criar honorário");
      }
      setSucesso("Honorário criado com sucesso.");
      setShowForm(false);
      setFormData({ clienteId: "", valor: "", diaVencimento: "10", periodicidade: "mensal" });
      fetchData();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSalvando(false);
    }
  }

  /* ── Email honorário ─────────────────────────────────────── */

  function openEmailForm(l: Lancamento) {
    setEmailLancId(l.id);
    setEmailDest("");
    setEmailAssunto(`Honor\u00e1rio - Compet\u00eancia ${l.competencia}`);
    setEmailCorpo(`Prezado(a),\n\nSegue o honor\u00e1rio referente \u00e0 compet\u00eancia ${l.competencia}.\n\nValor: ${formatBRL(l.valor)}\nVencimento: ${new Date(l.vencimento).toLocaleDateString("pt-BR")}\n\nFavor efetuar o pagamento at\u00e9 a data de vencimento.\n\nAtenciosamente.`);
    setEmailMsg(null);
    setSendingEmail(false);
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    setEmailMsg(null);
    try {
      const res = await fetch("/api/honorarios/enviar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinatario: emailDest,
          assunto: emailAssunto,
          corpo: emailCorpo,
          escritorioId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao enviar");
      setEmailMsg("Email enviado com sucesso!");
      setTimeout(() => setEmailLancId(null), 2000);
    } catch (e) {
      setEmailMsg(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSendingEmail(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Honorários</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/honorarios/relatorios"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Relatórios
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo Honorário
          </button>
        </div>
      </div>

      {/* Feedback messages */}
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {sucesso}
        </div>
      )}

      {/* Inline form for new honorário */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-800">Novo Honorário</h2>
          <form onSubmit={handleCriar} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cliente</label>
              {clientes.length > 0 ? (
                <select
                  value={formData.clienteId}
                  onChange={(e) => setFormData((f) => ({ ...f, clienteId: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                  required
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razaoSocial}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="ID do cliente"
                  value={formData.clienteId}
                  onChange={(e) => setFormData((f) => ({ ...f, clienteId: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                  required
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={formData.valor}
                onChange={(e) => setFormData((f) => ({ ...f, valor: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Dia Vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.diaVencimento}
                onChange={(e) => setFormData((f) => ({ ...f, diaVencimento: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Periodicidade</label>
              <select
                value={formData.periodicidade}
                onChange={(e) => setFormData((f) => ({ ...f, periodicidade: e.target.value }))}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
              >
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar Honorário"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Honorários table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Carregando...
        </div>
      ) : honorarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Nenhum honorário cadastrado ainda. Clique em &quot;Novo Honorário&quot; para começar.
        </div>
      ) : (
        <>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Valor (R$)</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Dia Venc.</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Periodicidade</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {honorarios.slice((paginaHon - 1) * porPagina, paginaHon * porPagina).map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {h.cliente?.razaoSocial ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatBRL(h.valor)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{h.diaVencimento}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{h.periodicidade}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={h.ativo ? "ativo" : "inativo"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          pagina={paginaHon}
          totalPaginas={Math.ceil(honorarios.length / porPagina)}
          onChange={setPaginaHon}
        />
        </>
      )}

      {/* Lançamentos pendentes / atrasados */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Lançamentos Pendentes / Atrasados
          </h2>
          <button
            onClick={handleGerarLancamentos}
            disabled={gerando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {gerando ? "Gerando..." : "Gerar Lançamentos do Mês"}
          </button>
        </div>

        {lancamentos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            Nenhum lançamento pendente ou atrasado.
          </div>
        ) : (
          <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Competência</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Vencimento</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lancamentos.slice((paginaLanc - 1) * porPagina, paginaLanc * porPagina).map((l) => (
                  <React.Fragment key={l.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {l.honorario?.cliente?.razaoSocial ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.competencia}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatBRL(l.valor)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(l.vencimento).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEmailForm(l)}
                          title="Enviar por email"
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePagar(l)}
                          disabled={pagandoId === l.id}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {pagandoId === l.id ? "Processando..." : "Marcar Pago"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {emailLancId === l.id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-gray-50">
                        <div className="space-y-2 max-w-lg">
                          {emailMsg && (
                            <p className={`text-xs font-medium ${emailMsg.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>{emailMsg}</p>
                          )}
                          <div className="flex gap-2">
                            <input type="email" placeholder="Email do destinat\u00e1rio" value={emailDest} onChange={(e) => setEmailDest(e.target.value)} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs" />
                          </div>
                          <input type="text" value={emailAssunto} onChange={(e) => setEmailAssunto(e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1 text-xs" />
                          <textarea rows={4} value={emailCorpo} onChange={(e) => setEmailCorpo(e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1 text-xs" />
                          <div className="flex gap-2">
                            <button onClick={handleSendEmail} disabled={sendingEmail || !emailDest} className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                              {sendingEmail ? "Enviando..." : "Enviar Email"}
                            </button>
                            <button onClick={() => setEmailLancId(null)} className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancelar</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            pagina={paginaLanc}
            totalPaginas={Math.ceil(lancamentos.length / porPagina)}
            onChange={setPaginaLanc}
          />
          </>
        )}
      </section>
    </div>
  );
}
