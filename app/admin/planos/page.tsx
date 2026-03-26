"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  maxUsuarios: number;
  maxClientes: number;
  ativo: boolean;
  _count: { escritorios: number };
}

const vazio = { nome: "", descricao: "", preco: 0, maxUsuarios: 5, maxClientes: 50 };

export default function PlanosPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState(vazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (session?.user?.role !== "admin") { router.push("/dashboard"); return; }
    carregar();
  }, [session, router]);

  async function carregar() {
    const res = await fetch("/api/admin/planos");
    if (res.ok) {
      const data = await res.json();
      setPlanos(data.planos);
    }
    setCarregando(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");

    const payload = { ...form, preco: Number(form.preco), maxUsuarios: Number(form.maxUsuarios), maxClientes: Number(form.maxClientes) };

    const url = editandoId ? `/api/admin/planos/${editandoId}` : "/api/admin/planos";
    const method = editandoId ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    if (res.ok) {
      setForm(vazio);
      setEditandoId(null);
      setFormAberto(false);
      carregar();
    } else {
      const data = await res.json();
      setErro(data.erro || "Erro ao salvar plano.");
    }
    setSalvando(false);
  }

  async function toggleAtivo(plano: Plano) {
    await fetch(`/api/admin/planos/${plano.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !plano.ativo }),
    });
    carregar();
  }

  async function excluir(plano: Plano) {
    if (!confirm(`Excluir o plano "${plano.nome}"?`)) return;
    const res = await fetch(`/api/admin/planos/${plano.id}`, { method: "DELETE" });
    if (res.ok) {
      carregar();
    } else {
      const data = await res.json();
      alert(data.erro || "Erro ao excluir.");
    }
  }

  function editar(plano: Plano) {
    setForm({
      nome: plano.nome,
      descricao: plano.descricao || "",
      preco: plano.preco,
      maxUsuarios: plano.maxUsuarios,
      maxClientes: plano.maxClientes,
    });
    setEditandoId(plano.id);
    setFormAberto(true);
  }

  function cancelar() {
    setForm(vazio);
    setEditandoId(null);
    setFormAberto(false);
    setErro("");
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
        {!formAberto && (
          <button
            onClick={() => { setFormAberto(true); setEditandoId(null); setForm(vazio); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo Plano
          </button>
        )}
      </div>

      {formAberto && (
        <form onSubmit={salvar} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">{editandoId ? "Editar Plano" : "Novo Plano"}</h2>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nome</label>
              <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Preço (R$)</label>
              <input required type="number" step="0.01" min="0" value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Máx. Usuários</label>
              <input required type="number" min="1" value={form.maxUsuarios} onChange={(e) => setForm({ ...form, maxUsuarios: Number(e.target.value) })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Máx. Clientes</label>
              <input required type="number" min="1" value={form.maxClientes} onChange={(e) => setForm({ ...form, maxClientes: Number(e.target.value) })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Descrição</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {salvando ? "Salvando..." : editandoId ? "Atualizar" : "Criar"}
            </button>
            <button type="button" onClick={cancelar} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Máx. Usuários</th>
                  <th className="px-4 py-3">Máx. Clientes</th>
                  <th className="px-4 py-3">Escritórios</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {planos.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.nome}</div>
                      {p.descricao && <div className="text-xs text-gray-400">{p.descricao}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(Number(p.preco))}</td>
                    <td className="px-4 py-3 text-gray-700">{p.maxUsuarios}</td>
                    <td className="px-4 py-3 text-gray-700">{p.maxClientes}</td>
                    <td className="px-4 py-3 text-gray-700">{p._count.escritorios}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => editar(p)} className="text-xs text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => toggleAtivo(p)} className="text-xs text-yellow-600 hover:underline">
                          {p.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button onClick={() => excluir(p)} className="text-xs text-red-600 hover:underline">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {planos.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum plano cadastrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
