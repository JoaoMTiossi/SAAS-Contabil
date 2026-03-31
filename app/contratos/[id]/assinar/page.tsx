"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Campo = "nome" | "cpf" | "papel";

export default function AssinarContratoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [papel, setPapel] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erros, setErros] = useState<Record<Campo, string>>({} as Record<Campo, string>);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  function validar(): boolean {
    const novosErros: Partial<Record<Campo, string>> = {};
    if (!nome.trim()) novosErros.nome = "Nome é obrigatório.";
    if (cpf && cpf.replace(/\D/g, "").length !== 11)
      novosErros.cpf = "CPF deve ter 11 dígitos numéricos.";
    if (!papel) novosErros.papel = "Selecione seu papel no contrato.";
    setErros(novosErros as Record<Campo, string>);
    return Object.keys(novosErros).length === 0;
  }

  async function handleAssinar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    setErroGeral(null);

    try {
      const res = await fetch(`/api/contratos/${id}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, cpf, papel }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.campos) {
          setErros(json.campos as Record<Campo, string>);
        }
        setErroGeral(json.erro ?? "Erro ao registrar assinatura.");
        return;
      }

      setSucesso(true);
    } catch {
      setErroGeral("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="mx-auto max-w-lg mt-16 text-center space-y-6">
        <div className="rounded-full bg-green-100 w-20 h-20 flex items-center justify-center mx-auto text-4xl">
          ✓
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assinatura Registrada!</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Sua assinatura foi registrada com sucesso. Um comprovante foi associado ao contrato.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link
            href={`/contratos/${id}`}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ver Contrato
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href={`/contratos/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Voltar ao contrato
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Assinar Contrato</h1>
        <p className="mt-1 text-sm text-gray-500">
          Preencha os dados abaixo para registrar sua assinatura eletrônica neste contrato.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Ao assinar, você confirma que leu e concorda com os termos do contrato. Sua assinatura será
        registrada com data, hora e IP de acesso.
      </div>

      <form onSubmit={handleAssinar} className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        {/* Nome */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => { setNome(e.target.value); setErros((p) => ({ ...p, nome: "" })); }}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${erros.nome ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            placeholder="Seu nome completo"
          />
          {erros.nome && <p className="mt-1 text-xs text-red-600">{erros.nome}</p>}
        </div>

        {/* CPF */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">CPF (opcional)</label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 11);
              const formatado = v
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
              setCpf(formatado);
              setErros((p) => ({ ...p, cpf: "" }));
            }}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${erros.cpf ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            placeholder="000.000.000-00"
          />
          {erros.cpf && <p className="mt-1 text-xs text-red-600">{erros.cpf}</p>}
        </div>

        {/* Papel */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Papel no Contrato <span className="text-red-500">*</span>
          </label>
          <select
            value={papel}
            onChange={(e) => { setPapel(e.target.value); setErros((p) => ({ ...p, papel: "" })); }}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${erros.papel ? "border-red-400 bg-red-50" : "border-gray-300"}`}
          >
            <option value="">Selecione seu papel...</option>
            <option value="contratante">Contratante</option>
            <option value="contratado">Contratado</option>
            <option value="testemunha">Testemunha</option>
          </select>
          {erros.papel && <p className="mt-1 text-xs text-red-600">{erros.papel}</p>}
        </div>

        {erroGeral && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erroGeral}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {enviando ? "Registrando..." : "Assinar Contrato"}
          </button>
        </div>
      </form>
    </div>
  );
}
