"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ContratoData {
  id: string;
  nome: string;
  email: string;
  papel: string;
  status: "pendente" | "visualizado" | "assinado" | "expirado";
  contrato: {
    id: string;
    identificador: string | null;
    contratante: string | null;
    contratado: string | null;
    textoOriginal: string | null;
  };
}

export default function AssinaturaPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ContratoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContrato() {
      try {
        const res = await fetch(`/api/assinatura/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Link de assinatura inválido ou não encontrado.");
          } else if (res.status === 410) {
            setError("Este contrato expirou e não pode mais ser assinado.");
          } else {
            const body = await res.json().catch(() => null);
            setError(body?.error || "Erro ao carregar contrato.");
          }
          return;
        }
        const json: ContratoData = await res.json();

        if (json.status === "assinado") {
          setSigned(true);
        }
        if (json.status === "expirado") {
          setError("Este contrato expirou e não pode mais ser assinado.");
          return;
        }
        setData(json);
      } catch {
        setError("Erro de conexão. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    }

    fetchContrato();
  }, [token]);

  async function handleSign() {
    if (!accepted || signing) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/assinatura/${token}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 409) {
          setError("Este contrato já foi assinado.");
        } else if (res.status === 410) {
          setError("Este contrato expirou e não pode mais ser assinado.");
        } else {
          setError(body?.error || "Erro ao assinar contrato.");
        }
        return;
      }
      setSigned(true);
      setSignedAt(new Date().toLocaleString("pt-BR"));
    } catch {
      setError("Erro de conexão ao assinar. Tente novamente.");
    } finally {
      setSigning(false);
    }
  }

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-800/80 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">Não foi possível carregar</h2>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // --- Signed / Success State ---
  if (signed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="w-full max-w-lg">
          {/* Certificate Card */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-800/80 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            {/* Top gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400" />

            <div className="p-8 text-center">
              {/* Success icon */}
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 ring-2 ring-emerald-400/30">
                <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h1
                className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                APOLUM HORIZON
              </h1>

              <h2 className="mt-4 text-xl font-semibold text-white">Contrato Assinado com Sucesso</h2>
              <p className="mt-2 text-sm text-slate-400">
                A assinatura digital foi registrada e vinculada ao contrato.
              </p>

              {/* Certificate details */}
              <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-5 text-left">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  Certificado de Assinatura
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contrato</span>
                    <span className="font-medium text-slate-300">
                      {data.contrato.identificador || data.contrato.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Signatário</span>
                    <span className="font-medium text-slate-300">{data.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium text-slate-300">{data.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Papel</span>
                    <span className="font-medium text-slate-300 capitalize">{data.papel}</span>
                  </div>
                  {signedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data/Hora</span>
                      <span className="font-medium text-slate-300">{signedAt}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="font-medium text-emerald-400">Assinado</span>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-xs text-slate-500">
                Token de verificação: {token.slice(0, 12)}...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Contract View ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            APOLUM HORIZON
          </h1>
          <p className="mt-2 text-sm text-slate-400">Plataforma de Assinatura Digital de Contratos</p>
        </div>

        {/* Contract Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/80 shadow-2xl backdrop-blur">
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400" />

          {/* Contract Meta */}
          <div className="border-b border-slate-700/50 p-6">
            <div className="flex flex-wrap items-center gap-3">
              {data.contrato.identificador && (
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 ring-1 ring-cyan-500/20">
                  {data.contrato.identificador}
                </span>
              )}
              <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400 ring-1 ring-yellow-500/20 capitalize">
                {data.status === "pendente" ? "Pendente de assinatura" : data.status}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {data.contrato.contratante && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Contratante</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">{data.contrato.contratante}</p>
                </div>
              )}
              {data.contrato.contratado && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Contratado</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">{data.contrato.contratado}</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
              <p className="text-xs text-slate-500">
                Signatário: <span className="text-slate-300">{data.nome}</span> ({data.email}) &mdash;{" "}
                <span className="capitalize text-slate-300">{data.papel}</span>
              </p>
            </div>
          </div>

          {/* Contract Text */}
          <div className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
              Termos do Contrato
            </h2>
            {data.contrato.textoOriginal ? (
              <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
                <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {data.contrato.textoOriginal}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6 text-center">
                <p className="text-sm text-slate-500">Texto do contrato não disponível.</p>
              </div>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-6 mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Signature Area */}
          <div className="border-t border-slate-700/50 p-6">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 transition-colors hover:border-cyan-500/30">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300">
                Li e aceito os termos do contrato acima. Declaro que estou de acordo com todas as cláusulas
                e condições apresentadas.
              </span>
            </label>

            <button
              onClick={handleSign}
              disabled={!accepted || signing}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {signing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Assinando...
                </span>
              ) : (
                "Assinar Contrato"
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-600">
          Assinatura digital segura via APOLUM HORIZON. Este documento tem validade jurídica.
        </p>
      </div>
    </div>
  );
}
