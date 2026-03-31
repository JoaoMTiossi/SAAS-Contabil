"use client";

import { useState } from "react";

interface Props {
  texto: string;
}

export function ContratoPreview({ texto }: Props) {
  const [expandido, setExpandido] = useState(false);

  // Filtra linhas de assinatura registradas para exibição separada
  const blocos = texto.split("--- ASSINATURA REGISTRADA ---");
  const textoContrato = blocos[0].trim();
  const assinaturas = blocos
    .slice(1)
    .map((b) => b.split("--- FIM DA ASSINATURA ---")[0].trim())
    .filter(Boolean);

  const linhasVisiveis = textoContrato.split("\n").slice(0, expandido ? undefined : 30);
  const totalLinhas = textoContrato.split("\n").length;
  const truncado = !expandido && totalLinhas > 30;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Pré-visualização do Texto</h2>
        <button
          onClick={() => setExpandido((p) => !p)}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          {expandido ? "▲ Recolher" : "▼ Ver completo"}
        </button>
      </div>

      {/* Texto do contrato */}
      <div className="relative">
        <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-mono border border-gray-100 max-h-96">
          {linhasVisiveis.join("\n")}
          {truncado && "\n..."}
        </pre>
        {truncado && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-lg bg-gradient-to-t from-gray-50 to-transparent" />
        )}
      </div>

      {truncado && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Mostrando 30 de {totalLinhas} linhas.{" "}
          <button
            onClick={() => setExpandido(true)}
            className="text-blue-600 hover:underline"
          >
            Ver tudo
          </button>
        </p>
      )}

      {/* Assinaturas registradas */}
      {assinaturas.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Assinaturas Registradas ({assinaturas.length})
          </h3>
          {assinaturas.map((assinatura, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 font-mono whitespace-pre-wrap"
            >
              {assinatura}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
