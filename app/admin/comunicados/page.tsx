"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Comunicado {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "info" | "aviso" | "manutencao" | "novidade";
  ativo: boolean;
  criadoEm: string;
  expiraEm: string | null;
}

const tipoCores: Record<string, { bg: string; text: string; label: string }> = {
  info: { bg: "bg-blue-50", text: "text-blue-700", label: "Info" },
  aviso: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Aviso" },
  manutencao: { bg: "bg-red-50", text: "text-red-700", label: "Manutenção" },
  novidade: { bg: "bg-green-50", text: "text-green-700", label: "Novidade" },
};

type TipoComunicado = "info" | "aviso" | "manutencao" | "novidade";
const vazio: { titulo: string; mensagem: string; tipo: TipoComunicado; expiraEm: string } = { titulo: "", mensagem: "", tipo: "info", expiraEm: "" };

export default function ComunicadosPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState<typeof vazio>(vazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (session?.user?.role !== "admin") { router.push("/dashboard"); return; }
    carregar();
  }, [session, router]);

  async function carregar() {
    const res = await fetch("/api/admin/comunicados");
    if (res.ok) {
      const data = await res.json();
      setComunicados(data.comunicados);
    }
    setCarregando(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const payload = { ...form, expiraEm: form.expiraEm || undefined };
    const url = editandoId ? `/api/admin/comunicados/${editandoId}` : "/api/admin/comunicados";
    const method = editandoId ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setForm(vazio);
      setEditandoId(null);
      setFormAberto(false);
      carregar();
    }
    setSalvando(false);
  }

  async function toggleAtivo(c: Comunicado) {
    await fetch(`/api/admin/comunicados/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    carregar();
  }

  async function excluir(c: Comunicado) {
    if (!confirm(`Excluir "${c.titulo}"?`)) return;
    await fetch(`/api/admin/comunicados/${c.id}`, { method: "DELETE" });
    carregar();
  }

  function editar(c: Comunicado) {
    setForm({
      titulo: c.titulo,
      mensagem: c.mensagem,
      tipo: c.tipo,
      expiraEm: c.expiraEm ? c.expiraEm.split("T")[0] : "",
    });
    setEditandoId(c.id);
    setFormAberto(true);
  }

  function cancelar() {
    setForm(vazio);
    setEditandoId(null);
    setFormAberto(false);
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Comunicados</h1>
        {!formAberto && (
          <button
            onClick={() => { setFormAberto(true); setEditandoId(null); setForm(vazio); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo Comunicado
          </button>
        )}
      </div>

      {formAberto && (
        <form onSubmit={salvar} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">{editandoId ? "Editar Comunicado" : "Novo Comunicado"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Título</label>
              <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoComunicado })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm">
                  <option value="info">Info</option>
                  <option value="aviso">Aviso</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="novidade">Novidade</option>
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-gray-700">Expira em</label>
                <input type="date" value={form.expiraEm} onChange={(e) => setForm({ ...form, expiraEm: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Mensagem</label>
            <textarea required rows={4} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} className="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {salvando ? "Salvando..." : editandoId ? "Atualizar" : "Criar"}
            </button>
            <button type="button" onClick={cancelar} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : comunicados.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
          Nenhum comunicado cadastrado
        </div>
      ) : (
        <div className="space-y-4">
          {comunicados.map((c) => {
            const cor = tipoCores[c.tipo] || tipoCores.info;
            return (
              <div key={c.id} className={`rounded-xl border bg-white shadow-sm ${!c.ativo ? "opacity-60" : ""}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cor.bg} ${cor.text}`}>
                          {cor.label}
                        </span>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">{c.titulo}</h3>
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{c.mensagem}</p>
                      <div className="mt-3 flex gap-4 text-xs text-gray-400">
                        <span>Criado em: {formatarData(c.criadoEm)}</span>
                        {c.expiraEm && <span>Expira em: {formatarData(c.expiraEm)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => editar(c)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => toggleAtivo(c)} className="text-xs text-yellow-600 hover:underline">
                        {c.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button onClick={() => excluir(c)} className="text-xs text-red-600 hover:underline">Excluir</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
