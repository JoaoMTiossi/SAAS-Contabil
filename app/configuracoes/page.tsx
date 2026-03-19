"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth";

export default function ConfiguracoesPage() {
  const { escritorioId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [isErro, setIsErro] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    emailRemetente: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpSecure: true,
    llmProvider: "openai",
    llmApiKey: "",
    llmModel: "",
  });

  const carregar = useCallback(async () => {
    if (!escritorioId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/escritorio/config?escritorioId=${escritorioId}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          nome: data.nome ?? "",
          cnpj: data.cnpj ?? "",
          email: data.email ?? "",
          emailRemetente: data.emailRemetente ?? "",
          smtpHost: data.smtpHost ?? "",
          smtpPort: String(data.smtpPort ?? "587"),
          smtpUser: data.smtpUser ?? "",
          smtpPass: data.smtpPass ?? "",
          smtpSecure: data.smtpSecure ?? true,
          llmProvider: data.llmProvider ?? "openai",
          llmApiKey: data.llmApiKey ?? "",
          llmModel: data.llmModel ?? "",
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [escritorioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagem("");
    setIsErro(false);

    try {
      const res = await fetch("/api/escritorio/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escritorioId,
          nome: form.nome,
          cnpj: form.cnpj || null,
          email: form.email,
          emailRemetente: form.emailRemetente || null,
          smtpHost: form.smtpHost || null,
          smtpPort: form.smtpPort ? parseInt(form.smtpPort) : null,
          smtpUser: form.smtpUser || null,
          smtpPass: form.smtpPass || null,
          smtpSecure: form.smtpSecure,
          llmProvider: form.llmProvider,
          llmApiKey: form.llmApiKey || null,
          llmModel: form.llmModel || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.erro ?? "Erro ao salvar");
      }

      setMensagem("Configurações salvas com sucesso.");
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : "Erro ao salvar configurações.");
      setIsErro(true);
    } finally {
      setSalvando(false);
    }
  }

  async function testarEmail() {
    setTestando(true);
    setMensagem("");
    setIsErro(false);
    try {
      const res = await fetch("/api/escritorio/config/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escritorioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao testar");
      setMensagem("Email de teste enviado com sucesso!");
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : "Erro ao testar email.");
      setIsErro(true);
    } finally {
      setTestando(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-400">Carregando configurações...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {mensagem && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${isErro ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          {mensagem}
        </div>
      )}

      <form onSubmit={salvar} className="space-y-6">
        {/* Dados do Escritório */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Dados do Escritório</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="nome" className="text-sm font-medium text-gray-700">Nome</label>
              <input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="cnpj" className="text-sm font-medium text-gray-700">CNPJ</label>
                <input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Configuração SMTP */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Configuração de Email (SMTP)</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="emailRemetente" className="text-sm font-medium text-gray-700">Email remetente</label>
              <input
                id="emailRemetente"
                type="email"
                value={form.emailRemetente}
                onChange={(e) => setForm({ ...form, emailRemetente: e.target.value })}
                placeholder="noreply@seuescritorio.com.br"
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="smtpHost" className="text-sm font-medium text-gray-700">Servidor SMTP</label>
                <input
                  id="smtpHost"
                  value={form.smtpHost}
                  onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="smtpPort" className="text-sm font-medium text-gray-700">Porta</label>
                <input
                  id="smtpPort"
                  type="number"
                  value={form.smtpPort}
                  onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                  placeholder="587"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="smtpUser" className="text-sm font-medium text-gray-700">Usuário SMTP</label>
                <input
                  id="smtpUser"
                  value={form.smtpUser}
                  onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="smtpPass" className="text-sm font-medium text-gray-700">Senha SMTP</label>
                <input
                  id="smtpPass"
                  type="password"
                  value={form.smtpPass}
                  onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="smtpSecure"
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="smtpSecure" className="text-sm text-gray-700">
                Conexão segura (TLS/SSL)
              </label>
            </div>
          </div>
        </section>

        {/* Configuração IA (LLM) */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Inteligência Artificial (LLM)</h2>
          <p className="mb-4 text-xs text-gray-500">
            Configure uma API de IA para análise automática de contratos, sugestões de cláusulas e mais.
          </p>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="llmProvider" className="text-sm font-medium text-gray-700">Provedor</label>
              <select
                id="llmProvider"
                value={form.llmProvider}
                onChange={(e) => setForm({ ...form, llmProvider: e.target.value })}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm bg-white"
              >
                <option value="openai">OpenAI (GPT)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="llmApiKey" className="text-sm font-medium text-gray-700">Chave de API</label>
              <input
                id="llmApiKey"
                type="password"
                value={form.llmApiKey}
                onChange={(e) => setForm({ ...form, llmApiKey: e.target.value })}
                placeholder={form.llmProvider === "openai" ? "sk-..." : "AIza..."}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="llmModel" className="text-sm font-medium text-gray-700">
                Modelo (opcional)
              </label>
              <input
                id="llmModel"
                value={form.llmModel}
                onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
                placeholder={form.llmProvider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
              />
              <p className="text-xs text-gray-400">
                Deixe em branco para usar o modelo padrão.
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar Configurações"}
          </button>
          {form.smtpHost && (
            <button
              type="button"
              onClick={testarEmail}
              disabled={testando}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {testando ? "Enviando..." : "Testar Email"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
