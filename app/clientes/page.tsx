"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

type RegimeTributario = "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei";

interface Cliente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  regimeTributario: RegimeTributario | null;
  _count: {
    contratos: number;
    honorarios: number;
  };
}

const REGIME_LABELS: Record<RegimeTributario, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
};

const emptyForm = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  email: "",
  telefone: "",
  regimeTributario: "" as string,
};

export default function ClientesPage() {
  const { escritorioId: ESCRITORIO_ID, loading: authLoading } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [erro, setErro] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?escritorioId=${ESCRITORIO_ID}`);
      const data = await res.json();
      setClientes(data.clientes ?? []);
    } catch {
      console.error("Erro ao buscar clientes");
    } finally {
      setLoading(false);
    }
  }, [ESCRITORIO_ID]);

  useEffect(() => {
    if (!authLoading && ESCRITORIO_ID) fetchClientes();
  }, [fetchClientes, authLoading, ESCRITORIO_ID]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          regimeTributario: form.regimeTributario || null,
          nomeFantasia: form.nomeFantasia || null,
          cnpj: form.cnpj || null,
          email: form.email || null,
          telefone: form.telefone || null,
          escritorioId: ESCRITORIO_ID,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErro(data.erro ?? "Erro ao criar cliente.");
        return;
      }

      setForm(emptyForm);
      setShowForm(false);
      await fetchClientes();
    } catch {
      setErro("Erro de conexão ao criar cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setErro(null);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "+ Novo Cliente"}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Novo Cliente</h2>

          {erro && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Razão Social *
              </label>
              <input
                name="razaoSocial"
                value={form.razaoSocial}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Ex: Empresa ABC Ltda"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome Fantasia
              </label>
              <input
                name="nomeFantasia"
                value={form.nomeFantasia}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Ex: ABC"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ</label>
              <input
                name="cnpj"
                value={form.cnpj}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="contato@empresa.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
              <input
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Regime Tributário
              </label>
              <select
                name="regimeTributario"
                value={form.regimeTributario}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">Selecione...</option>
                <option value="simples_nacional">Simples Nacional</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
                <option value="mei">MEI</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setErro(null);
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar Cliente"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">Carregando clientes...</p>
        </div>
      ) : clientes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500">Nenhum cliente cadastrado.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Cadastrar primeiro cliente
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Razão Social</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">CNPJ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Regime Tributário
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Contratos</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Honorários</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.razaoSocial}</div>
                    {c.nomeFantasia && (
                      <div className="text-xs text-gray-400">{c.nomeFantasia}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.cnpj ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.regimeTributario ? REGIME_LABELS[c.regimeTributario] : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.contratos}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.honorarios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
