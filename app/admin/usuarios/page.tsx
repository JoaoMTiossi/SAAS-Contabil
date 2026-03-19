"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
  escritorioId: string;
  createdAt: string;
  escritorio: { nome: string };
}

interface Empresa {
  id: string;
  nome: string;
}

export default function UsuariosPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "colaborador", escritorioId: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [resU, resE] = await Promise.all([
      fetch("/api/admin/usuarios"),
      fetch("/api/admin/empresas"),
    ]);
    if (resU.ok) setUsuarios((await resU.json()).usuarios);
    if (resE.ok) setEmpresas((await resE.json()).escritorios);
  }, []);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    carregar();
  }, [session, router, carregar]);

  function abrirForm(usuario?: Usuario) {
    if (usuario) {
      setEditando(usuario);
      setForm({
        nome: usuario.nome,
        email: usuario.email,
        senha: "",
        role: usuario.role,
        escritorioId: usuario.escritorioId,
      });
    } else {
      setEditando(null);
      setForm({ nome: "", email: "", senha: "", role: "colaborador", escritorioId: empresas[0]?.id ?? "" });
    }
    setMostrarForm(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const payload = { ...form };
    if (editando && !payload.senha) {
      const { senha: _, ...rest } = payload;
      void _;
      const url = `/api/admin/usuarios/${editando.id}`;
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
    } else {
      const url = editando ? `/api/admin/usuarios/${editando.id}` : "/api/admin/usuarios";
      const method = editando ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSalvando(false);
    setMostrarForm(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este usuário?")) return;
    await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" });
    carregar();
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
        <button
          onClick={() => abrirForm()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Usuário
        </button>
      </div>

      {mostrarForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editando ? "Editar Usuário" : "Novo Usuário"}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Senha {editando && "(deixe vazio para manter)"}
                </label>
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  {...(!editando ? { required: true } : {})}
                  minLength={6}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Perfil</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Empresa</label>
                <select
                  value={form.escritorioId}
                  onChange={(e) => setForm({ ...form, escritorioId: e.target.value })}
                  required
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                >
                  <option value="">Selecione...</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
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
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.escritorio.nome}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirForm(u)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(u.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
