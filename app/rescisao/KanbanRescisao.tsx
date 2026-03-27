"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DateInput } from "@/components/ui/DateInput";

type EstagioRescisao = "notificado" | "em_negociacao" | "aguardando_documentos" | "concluido";

interface Contrato {
  id: string;
  identificador: string | null;
  contratante: string | null;
  contratado: string | null;
  dataFim: string | null;
  status: string;
}

interface Rescisao {
  id: string;
  contratoId: string;
  estagio: EstagioRescisao;
  motivo: string | null;
  responsavel: string | null;
  dataInicio: string;
  dataPrevisao: string | null;
  observacoes: string | null;
  contrato: Contrato;
}

interface Props {
  rescisoes: Rescisao[];
  contratosDisponiveis: Contrato[];
}

const ESTAGIOS: { id: EstagioRescisao; label: string; cor: string }[] = [
  { id: "notificado", label: "Notificado", cor: "bg-yellow-50 border-yellow-200" },
  { id: "em_negociacao", label: "Em Negociação", cor: "bg-blue-50 border-blue-200" },
  { id: "aguardando_documentos", label: "Aguard. Documentos", cor: "bg-purple-50 border-purple-200" },
  { id: "concluido", label: "Concluído", cor: "bg-green-50 border-green-200" },
];

const COR_HEADER: Record<EstagioRescisao, string> = {
  notificado: "bg-yellow-100 text-yellow-800",
  em_negociacao: "bg-blue-100 text-blue-800",
  aguardando_documentos: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
};

interface EditandoCard {
  id: string;
  motivo: string;
  responsavel: string;
  dataPrevisao: string;
  observacoes: string;
}

export function KanbanRescisao({ rescisoes: initialRescisoes, contratosDisponiveis }: Props) {
  const router = useRouter();
  const [rescisoes, setRescisoes] = useState(initialRescisoes);
  const [editando, setEditando] = useState<EditandoCard | null>(null);
  const [novaRescisao, setNovaRescisao] = useState(false);
  const [novoForm, setNovoForm] = useState({
    contratoId: "",
    motivo: "",
    responsavel: "",
    dataPrevisao: "",
    observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrirEdicao(r: Rescisao) {
    setEditando({
      id: r.id,
      motivo: r.motivo ?? "",
      responsavel: r.responsavel ?? "",
      dataPrevisao: r.dataPrevisao
        ? format(new Date(r.dataPrevisao), "dd/MM/yyyy")
        : "",
      observacoes: r.observacoes ?? "",
    });
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/rescisao/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: editando.motivo || null,
          responsavel: editando.responsavel || null,
          dataPrevisao: editando.dataPrevisao || null,
          observacoes: editando.observacoes || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setEditando(null);
      router.refresh();
    } catch {
      setErro("Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  }

  async function moverEstagio(id: string, estagio: EstagioRescisao) {
    setRescisoes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estagio } : r))
    );
    await fetch(`/api/rescisao/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estagio }),
    });
    router.refresh();
  }

  async function criarRescisao() {
    if (!novoForm.contratoId) {
      setErro("Selecione um contrato.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/rescisao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoId: novoForm.contratoId,
          motivo: novoForm.motivo || null,
          responsavel: novoForm.responsavel || null,
          dataPrevisao: novoForm.dataPrevisao || null,
          observacoes: novoForm.observacoes || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.erro ?? "Erro ao criar rescisão");
      }
      setNovaRescisao(false);
      setNovoForm({ contratoId: "", motivo: "", responsavel: "", dataPrevisao: "", observacoes: "" });
      router.refresh();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Remover este processo de rescisão?")) return;
    await fetch(`/api/rescisao/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban de Rescisão</h1>
          <p className="text-sm text-gray-500">Gerencie o processo de rescisão de contratos</p>
        </div>
        <button
          onClick={() => setNovaRescisao(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova Rescisão
        </button>
      </div>

      {erro && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Formulário nova rescisão */}
      {novaRescisao && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Novo Processo de Rescisão</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Contrato <span className="text-red-500">*</span>
              </label>
              <select
                value={novoForm.contratoId}
                onChange={(e) => setNovoForm({ ...novoForm, contratoId: e.target.value })}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">Selecione um contrato...</option>
                {contratosDisponiveis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.identificador ?? c.id} — {c.contratante ?? "Sem contratante"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Responsável</label>
              <input
                type="text"
                value={novoForm.responsavel}
                onChange={(e) => setNovoForm({ ...novoForm, responsavel: e.target.value })}
                placeholder="Nome do responsável"
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Motivo</label>
              <input
                type="text"
                value={novoForm.motivo}
                onChange={(e) => setNovoForm({ ...novoForm, motivo: e.target.value })}
                placeholder="Motivo da rescisão"
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <DateInput
              label="Data Prevista para Conclusão"
              value={novoForm.dataPrevisao || null}
              onChange={(v) => setNovoForm({ ...novoForm, dataPrevisao: v ?? "" })}
            />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Observações</label>
              <textarea
                rows={2}
                value={novoForm.observacoes}
                onChange={(e) => setNovoForm({ ...novoForm, observacoes: e.target.value })}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={criarRescisao}
              disabled={salvando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Criar Rescisão"}
            </button>
            <button
              onClick={() => { setNovaRescisao(false); setErro(null); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="font-semibold text-gray-800">Editar Rescisão</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Motivo</label>
                <input
                  type="text"
                  value={editando.motivo}
                  onChange={(e) => setEditando({ ...editando, motivo: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Responsável</label>
                <input
                  type="text"
                  value={editando.responsavel}
                  onChange={(e) => setEditando({ ...editando, responsavel: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <DateInput
                label="Data Prevista"
                value={editando.dataPrevisao || null}
                onChange={(v) => setEditando({ ...editando, dataPrevisao: v ?? "" })}
              />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Observações</label>
                <textarea
                  rows={3}
                  value={editando.observacoes}
                  onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <div className="flex gap-2">
              <button
                onClick={salvarEdicao}
                disabled={salvando}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => { setEditando(null); setErro(null); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-4">
        {ESTAGIOS.map((col) => {
          const cards = rescisoes.filter((r) => r.estagio === col.id);
          return (
            <div key={col.id} className={`rounded-xl border p-3 ${col.cor}`}>
              <div className={`mb-3 flex items-center justify-between rounded-lg px-3 py-1.5 ${COR_HEADER[col.id]}`}>
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="text-xs">{cards.length}</span>
              </div>
              <div className="space-y-3">
                {cards.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">Nenhum processo</p>
                )}
                {cards.map((r) => (
                  <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-800">
                        {r.contrato.identificador ?? "Sem ID"}
                      </p>
                      <p className="text-xs text-gray-500">{r.contrato.contratante ?? "—"}</p>
                      {r.motivo && (
                        <p className="mt-1 text-xs text-gray-600">
                          <span className="font-medium">Motivo:</span> {r.motivo}
                        </p>
                      )}
                      {r.responsavel && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Resp.:</span> {r.responsavel}
                        </p>
                      )}
                      {r.dataPrevisao && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Previsão:</span>{" "}
                          {format(new Date(r.dataPrevisao), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>

                    {/* Mover estágio */}
                    <div className="mt-2 border-t border-gray-100 pt-2 flex items-center justify-between gap-1">
                      <select
                        value={r.estagio}
                        onChange={(e) => moverEstagio(r.id, e.target.value as EstagioRescisao)}
                        className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-xs focus:outline-none"
                      >
                        {ESTAGIOS.map((e) => (
                          <option key={e.id} value={e.id}>{e.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => abrirEdicao(r)}
                        className="rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50"
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(r.id)}
                        className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-50"
                        title="Excluir"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
