"use client";

import { useState } from "react";

export default function ConfiguracoesPage() {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [notificacoesDashboard, setNotificacoesDashboard] = useState(true);
  const [emailRemetente, setEmailRemetente] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [isErro, setIsErro] = useState(false);

  async function salvarDados(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagem("");
    setIsErro(false);

    try {
      // Simula salvamento — integrar com API real conforme necessário
      await new Promise((resolve) => setTimeout(resolve, 500));
      setMensagem("Configurações salvas com sucesso.");
    } catch {
      setMensagem("Erro ao salvar configurações.");
      setIsErro(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {mensagem && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${isErro ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          {mensagem}
        </div>
      )}

      {/* Dados do Escritório */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Dados do Escritório
        </h2>
        <form onSubmit={salvarDados} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do escritório"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="cnpj" className="text-sm font-medium text-gray-700">
              CNPJ
            </label>
            <input
              id="cnpj"
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@escritorio.com.br"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </section>

      {/* Notificações */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Notificações
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="notificacoes-dashboard"
              type="checkbox"
              checked={notificacoesDashboard}
              onChange={(e) => setNotificacoesDashboard(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label
              htmlFor="notificacoes-dashboard"
              className="text-sm font-medium text-gray-700"
            >
              Ativar notificações no dashboard
            </label>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="email-remetente"
              className="text-sm font-medium text-gray-700"
            >
              Email remetente
            </label>
            <input
              id="email-remetente"
              type="email"
              value={emailRemetente}
              onChange={(e) => setEmailRemetente(e.target.value)}
              placeholder="noreply@escritorio.com.br"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
