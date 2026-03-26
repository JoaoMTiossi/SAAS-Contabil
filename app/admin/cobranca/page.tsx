"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Escritorio { id: string; nome: string; }

interface Cobranca {
  id: string;
  escritorioId: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  dataPagamento: string | null;
  observacao: string | null;
  escritorio: { nome: string };
}

interface Resumo { pendente: number; atrasado: number; pagoMes: number; }

const statusCores: Record<string, { bg: string; text: string }> = {
  pendente: { bg: "bg-yellow-50", text: "text-yellow-700" },
  pago: { bg: "bg-green-50", text: "text-green-700" },
  atrasado: { bg: "bg-red-50", text: "text-red-700" },
  cancelado: { bg: "bg-gray-100", text: "text-gray-500" },
};

const formVazio = { escritorioId: "", descricao: "", valor: 0, vencimento: "", observacao: "" };

export default function CobrancaPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ pendente: 0, atrasado: 0, pagoMes: 0 });
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(true);

  const [escritorios, setEscritorios] = useState<Escritorio[]>([]);
  const [filtroEscritorio, setFiltroEscritorio] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR");

  const carregar = useCallback(async (pagina: number) => {
    setCarregando(true);
    const params = new URLSearchParams();
    params.set("page", String(pagina));
    params.set("limit", "50");
    if (filtroEscritorio) params.set("escritorioId", filtroEscritorio);
    if (filtroStatus) params.set("status", filtroStatus);

    const res = await fetch(`/api/admin/cobranca?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCobrancas(data.cobrancas);
      setTotal(data.total);
      setPaginas(data.paginas);
      setResumo(data.resumo);
    }
    setCarregando(false);
  }, [filtroEscritorio, filtroStatus]);

  useEffect(() => {
    if (session?.user?.role !== "admin") { router.push("/dashboard"); return; }
    fetch("/api/admin/empresas")
      .then((r) => r.json())
      .then((data) => { if (data.escritorios) setEscritorios(data.escritorios); });
    carregar(1);
  }, [session, router, carregar]);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    carregar(1);
  }

  function irPara(p: number) {
    setPage(p);
    carregar(p);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const payload = { ...form, valor: Number(form.valor) };
    const res = await fetch("/api/admin/cobranca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setForm(formVazio);
      setFormAberto(false);
      carregar(page);
    }
    setSalvando(false);
  }

  async function marcarPago(id: string) {
    await fetch(`/api/admin/cobranca/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pago" }),
    });
    carregar(page);
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar esta cobrança?")) return;
    await fetch(`/api/admin/cobranca/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado" }),
    });
    carregar(page);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta cobrança permanentemente?")) return;
    await fetch(`/api/admin/cobranca/${id}`, { method: "DELETE" });
    carregar(page);
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cobrança</h1>
        {!formAberto && (
          <button onClick={() => setFormAberto(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Nova Cobrança
          </button>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Pendente</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{formatCurrency(resumo.pendente)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Atrasado</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(resumo.atrasado)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pago no Mês</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(resumo.pagoMes)}</p>
        </div>
      </div>

      {/* Form */}
      {formAberto && (
        <form onSubmit={criar} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Nova Cobrança</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Escritório</label>
              <select required value={form.escritorioId} onChange={(e) => setForm({ ...form, escritorioId: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm">
                <option value="">Selecione...</option>
                {escritorios.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descrição</label>
              <input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Valor (R$)</label>
              <input required type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Vencimento</label>
              <input required type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {salvando ? "Salvando..." : "Criar"}
            </button>
            <button type="button" onClick={() => { setFormAberto(false); setForm(formVazio); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <form onSubmit={buscar} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Escritório</label>
            <select value={filtroEscritorio} onChange={(e) => setFiltroEscritorio(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm">
              <option value="">Todos</option>
              {escritorios.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm">
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Buscar</button>
          </div>
        </div>
      </form>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-4 py-3">Escritório</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cobrancas.map((c) => {
                    const cor = statusCores[c.status] || statusCores.pendente;
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.escritorio.nome}</td>
                        <td className="px-4 py-3 text-gray-700">{c.descricao}</td>
                        <td className="px-4 py-3 text-gray-700">{formatCurrency(Number(c.valor))}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(c.vencimento)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cor.bg} ${cor.text}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {c.status === "pendente" || c.status === "atrasado" ? (
                              <>
                                <button onClick={() => marcarPago(c.id)} className="text-xs text-green-600 hover:underline">Pago</button>
                                <button onClick={() => cancelar(c.id)} className="text-xs text-gray-500 hover:underline">Cancelar</button>
                              </>
                            ) : null}
                            <button onClick={() => excluir(c.id)} className="text-xs text-red-600 hover:underline">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {cobrancas.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma cobrança encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {paginas > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <span className="text-sm text-gray-500">{total} registro{total !== 1 ? "s" : ""} — Página {page} de {paginas}</span>
                <div className="flex gap-2">
                  <button onClick={() => irPara(page - 1)} disabled={page <= 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">Anterior</button>
                  <button onClick={() => irPara(page + 1)} disabled={page >= paginas} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">Próximo</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
