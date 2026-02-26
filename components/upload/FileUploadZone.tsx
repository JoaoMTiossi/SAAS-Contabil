"use client";

import { useCallback, useState } from "react";

interface Props {
  onTextoPuro: (texto: string) => void;
  onExtraido: (dados: unknown) => void;
  carregando: boolean;
  setCarregando: (v: boolean) => void;
}

export function FileUploadZone({ onTextoPuro, onExtraido, carregando, setCarregando }: Props) {
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const processar = useCallback(
    async (arquivo: File) => {
      setErro(null);
      setCarregando(true);
      try {
        const form = new FormData();
        form.append("arquivo", arquivo);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.erro ?? "Erro ao processar arquivo.");
        }
        const json = await res.json();
        onTextoPuro(json.texto_original ?? "");
        onExtraido(json.extraido);
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setCarregando(false);
      }
    },
    [onTextoPuro, onExtraido, setCarregando]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setArrastando(false);
      const arquivo = e.dataTransfer.files[0];
      if (arquivo) processar(arquivo);
    },
    [processar]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors
          ${arrastando ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"}`}
      >
        <svg className="mb-4 h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Arraste um arquivo aqui ou{" "}
          <label className="cursor-pointer text-blue-600 underline">
            clique para selecionar
            <input
              type="file"
              className="hidden"
              accept=".docx,.txt"
              disabled={carregando}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processar(f);
              }}
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">Suporta .docx e .txt</p>
        {carregando && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Extraindo prazos...
          </div>
        )}
      </div>

      {/* Alternativa: colar texto */}
      <details className="rounded border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          Ou cole o texto do contrato
        </summary>
        <div className="p-4">
          <textarea
            rows={8}
            placeholder="Cole aqui o texto do contrato..."
            className="w-full rounded border border-gray-200 p-3 text-sm focus:border-blue-400 focus:outline-none"
            onBlur={(e) => {
              if (e.target.value.trim()) {
                const blob = new Blob([e.target.value], { type: "text/plain" });
                const file = new File([blob], "contrato.txt", { type: "text/plain" });
                processar(file);
              }
            }}
          />
          <p className="mt-1 text-xs text-gray-400">
            A extração ocorre ao clicar fora do campo de texto.
          </p>
        </div>
      </details>

      {erro && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}
    </div>
  );
}
