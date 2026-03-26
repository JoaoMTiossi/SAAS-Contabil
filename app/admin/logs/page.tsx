"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Log {
  id: string;
  escritorioId: string | null;
  usuarioId: string | null;
  usuarioNome: string;
  usuarioEmail: string;
  acao: string;
  detalhes: string | null;
  ip: string | null;
  criadoEm: string;
  escritorio: { nome: string } | null;
}

interface Escritorio {
  id: string;
  nome: string;
}

export default function LogsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(true);

  const [escritorios, setEscritorios] = useState<Escritorio[]>([]);
  const [filtroEscritorio, setFiltroEscritorio] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");

  const carregar = useCallback(
    async (pagina: number) => {
      setCarregando(true);
      const params = new URLSearchParams();
      params.set("page", String(pagina));
      params.set("limit", "50");
      if (filtroEscritorio) params.set("escritorioId", filtroEscritorio);
      if (filtroAcao) params.set("acao", filtroAcao);
      if (filtroDe) params.set("de", filtroDe);
      if (filtroAte) params.set("ate", filtroAte);

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setPaginas(data.paginas);
      }
      setCarregando(false);
    },
    [filtroEscritorio, filtroAcao, filtroDe, filtroAte]
  );

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/admin/empresas")
      .then((r) => r.json())
      .then((data) => {
        if (data.escritorios) setEscritorios(data.escritorios);
      });
    carregar(1);
  }, [session, router, carregar]);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    carregar(1);
  }

  function irPara(p: number) {
    setPage(p);
    carregar(p);
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function truncar(texto: string | null, max: number) {
    if (!texto) return "—";
    return texto.length > max ? texto.slice(0, max) + "..." : texto;
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Logs de Atividade</h1>

      {/* Filters */}
      <form
        onSubmit={buscar}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Escritorio
            </label>
            <select
              value={filtroEscritorio}
              onChange={(e) => setFiltroEscritorio(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {escritorios.map((esc) => (
                <option key={esc.id} value={esc.id}>
                  {esc.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Acao</label>
            <input
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
              placeholder="Ex: login, criar..."
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">De</label>
            <input
              type="date"
              value={filtroDe}
              onChange={(e) => setFiltroDe(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ate</label>
            <input
              type="date"
              value={filtroAte}
              onChange={(e) => setFiltroAte(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Buscar
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Acao</th>
                    <th className="px-4 py-3">Detalhes</th>
                    <th className="px-4 py-3">Escritorio</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {formatarData(log.criadoEm)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {log.usuarioNome}
                        </div>
                        <div className="text-xs text-gray-400">
                          {log.usuarioEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {log.acao}
                        </span>
                      </td>
                      <td
                        className="max-w-xs px-4 py-3 text-gray-500"
                        title={log.detalhes ?? ""}
                      >
                        {truncar(log.detalhes, 60)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {log.escritorio?.nome ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-400">
                        {log.ip ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {paginas > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <span className="text-sm text-gray-500">
                  {total} registro{total !== 1 ? "s" : ""} — Pagina {page} de{" "}
                  {paginas}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => irPara(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => irPara(page + 1)}
                    disabled={page >= paginas}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Proximo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
