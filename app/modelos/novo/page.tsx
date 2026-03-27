"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NovoModeloPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("Nome do modelo é obrigatório.");
      return;
    }
    if (!arquivo) {
      setErro("Selecione um arquivo .docx ou .txt com o template.");
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      form.append("nome", nome.trim());
      if (descricao.trim()) form.append("descricao", descricao.trim());

      const res = await fetch("/api/modelos", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.erro ?? "Erro ao criar modelo.");
      }

      const modelo = await res.json();
      router.push(`/modelos/${modelo.id}`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Modelo de Contrato</h1>
        <p className="text-sm text-gray-500">
          Envie um documento .docx ou .txt com variáveis no formato {"{{nome_variavel}}"}.
        </p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <strong>Como usar variáveis:</strong> No seu documento, use {"{{nome}}"}, {"{{cnpj}}"}, {"{{endereco}}"}, etc.
        Essas variáveis serão detectadas automaticamente e se tornarão campos preenchíveis ao gerar o contrato.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome do Modelo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Contrato de Prestação de Serviços"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição opcional do modelo..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Documento Template <span className="text-red-500">*</span>
          </label>
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 transition-colors">
            {arquivo ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-gray-700">{arquivo.name}</span>
                <button
                  type="button"
                  onClick={() => setArquivo(null)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remover
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <p className="text-sm text-gray-600">
                  Clique para selecionar ou arraste um arquivo
                </p>
                <p className="mt-1 text-xs text-gray-400">Suporta .docx e .txt</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".docx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setArquivo(f);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {erro && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={carregando}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {carregando ? "Criando..." : "Criar Modelo"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/modelos")}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
