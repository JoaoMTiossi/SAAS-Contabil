"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const TODOS_MODULOS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "contratos", label: "Contratos" },
  { id: "clientes", label: "Clientes" },
  { id: "honorarios", label: "Honorários" },
  { id: "calendario-fiscal", label: "Calendário Fiscal" },
  { id: "rescisoes", label: "Rescisões" },
  { id: "timesheet", label: "Timesheet" },
  { id: "alertas", label: "Alertas" },
  { id: "configuracoes", label: "Configurações" },
];

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string;
  _count: { usuarios: number; clientes: number };
  modulos: { modulo: string }[];
}

export default function EmpresasPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [form, setForm] = useState({ nome: "", cnpj: "", email: "", modulos: [...TODOS_MODULOS.map((m) => m.id)] });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const res = await fetch("/api/admin/empresas");
    if (res.ok) {
      const data = await res.json();
      setEmpresas(data.escritorios);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    carregar();
  }, [session, router, carregar]);

  function abrirForm(empresa?: Empresa) {
    if (empresa) {
      setEditando(empresa);
      setForm({
        nome: empresa.nome,
        cnpj: empresa.cnpj ?? "",
        email: empresa.email,
        modulos: empresa.modulos.map((m) => m.modulo),
      });
    } else {
      setEditando(null);
      setForm({ nome: "", cnpj: "", email: "", modulos: [...TODOS_MODULOS.map((m) => m.id)] });
    }
    setMostrarForm(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const url = editando ? `/api/admin/empresas/${editando.id}` : "/api/admin/empresas";
    const method = editando ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    setMostrarForm(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta empresa? Todos os dados vinculados serão perdidos.")) return;
    await fetch(`/api/admin/empresas/${id}`, { method: "DELETE" });
    carregar();
  }

  function toggleModulo(modulo: string) {
    setForm((f) => ({
      ...f,
      modulos: f.modulos.includes(modulo) ? f.modulos.filter((m) => m !== modulo) : [...f.modulos, modulo],
    }));
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Empresas</h1>
        <button
          onClick={() => abrirForm()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova Empresa
        </button>
      </div>

      {mostrarForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editando ? "Editar Empresa" : "Nova Empresa"}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">CNPJ</label>
                <input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Módulos habilitados</label>
              <div className="flex flex-wrap gap-2">
                {TODOS_MODULOS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModulo(m.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      form.modulos.includes(m.id)
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Usuários</th>
              <th className="px-4 py-3">Módulos</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.nome}</td>
                <td className="px-4 py-3 text-gray-500">{e.cnpj ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{e.email}</td>
                <td className="px-4 py-3 text-gray-500">{e._count.usuarios}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {e.modulos.map((m) => (
                      <span key={m.modulo} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">
                        {m.modulo}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirForm(e)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(e.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma empresa cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
