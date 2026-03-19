"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificacaoBell() {
  const { data: session } = useSession();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const escritorioId = session?.user?.escritorioId;

  const carregar = useCallback(async () => {
    if (!escritorioId) return;
    try {
      const res = await fetch(`/api/notificacoes?escritorioId=${escritorioId}`);
      if (res.ok) {
        const data = await res.json();
        setNotificacoes(data.notificacoes ?? []);
        setTotalNaoLidas(data.totalNaoLidas ?? 0);
      }
    } catch { /* ignore */ }
  }, [escritorioId]);

  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, 30_000);
    return () => clearInterval(interval);
  }, [carregar]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function marcarLida(id: string) {
    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificacaoId: id }),
    });
    carregar();
  }

  function tempoAtras(dataStr: string) {
    const diff = Date.now() - new Date(dataStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  if (!session) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(!aberto)}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        aria-label="Notificações"
      >
        {/* Bell SVG */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {totalNaoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
            {totalNaoLidas > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                {totalNaoLidas} não lida{totalNaoLidas > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Nenhuma notificação
              </div>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-gray-50 px-4 py-3 ${!n.lida ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.lida ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {n.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.mensagem}</p>
                      <span className="mt-1 text-[10px] text-gray-400">{tempoAtras(n.createdAt)}</span>
                    </div>
                    {!n.lida && (
                      <button
                        onClick={() => marcarLida(n.id)}
                        className="shrink-0 rounded px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-100"
                      >
                        Marcar lida
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
