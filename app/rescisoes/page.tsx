"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

// ─── Types ──────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  descricao: string;
  feito: boolean;
  ordem: number;
}

interface KanbanCard {
  id: string;
  motivo: string | null;
  createdAt: string;
  dataPrevisao: string | null;
  contrato: { identificador: string | null; contratante: string | null; contratado: string | null };
  cliente: { razaoSocial: string | null };
  checklists: ChecklistItem[];
}

interface KanbanColuna {
  id: string;
  nome: string;
  cor: string | null;
  ordem: number;
  cards: KanbanCard[];
}

interface KanbanBoard {
  id: string;
  colunas: KanbanColuna[];
}

interface ContratoOption {
  id: string;
  identificador: string | null;
  contratante: string | null;
  clienteId: string | null;
}

interface ClienteOption {
  id: string;
  razaoSocial: string;
}

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const normalized = iso.length === 10 ? `${iso}T12:00:00` : iso;
  const d = new Date(normalized);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── Component ──────────────────────────────────────────────────

export default function RescisoesPage() {
  const { escritorioId } = useAuth();
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Dropdowns data
  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  // Card detail modal
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [selectedCardColunaId, setSelectedCardColunaId] = useState<string>("");

  // Nova rescisão form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ contratoId: "", clienteId: "", motivo: "" });
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch Board ─────────────────────────────────────────────

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/kanban?escritorioId=${escritorioId}`);
      if (!res.ok) throw new Error("Erro ao carregar board");
      const data: KanbanBoard = await res.json();
      setBoard(data);
      setErro(null);
    } catch {
      setErro("Não foi possível carregar o quadro de rescisões.");
    } finally {
      setLoading(false);
    }
  }, [escritorioId]);

  // ── Fetch Contratos & Clientes for dropdowns ──────────────

  const fetchOptions = useCallback(async () => {
    try {
      const [contratosRes, clientesRes] = await Promise.all([
        fetch(`/api/contratos?escritorioId=${escritorioId}&limit=200`),
        fetch(`/api/clientes?escritorioId=${escritorioId}&limit=200`),
      ]);
      if (contratosRes.ok) {
        const data = await contratosRes.json();
        setContratos(data.contratos ?? data.data ?? data ?? []);
      }
      if (clientesRes.ok) {
        const data = await clientesRes.json();
        setClientes(data.clientes ?? data.data ?? data ?? []);
      }
    } catch {
      // ignore - user can still type IDs
    }
  }, [escritorioId]);

  useEffect(() => {
    fetchBoard();
    fetchOptions();
  }, [fetchBoard, fetchOptions]);

  // ── Create Card ─────────────────────────────────────────────

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.contratoId || !formData.clienteId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escritorioId,
          contratoId: formData.contratoId,
          clienteId: formData.clienteId,
          motivo: formData.motivo || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar rescisão");
      setFormData({ contratoId: "", clienteId: "", motivo: "" });
      setShowForm(false);
      await fetchBoard();
    } catch {
      alert("Erro ao criar rescisão. Verifique os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-fill clienteId when contrato is selected
  function handleContratoChange(contratoId: string) {
    setFormData((f) => ({ ...f, contratoId }));
    const contrato = contratos.find((c) => c.id === contratoId);
    if (contrato?.clienteId) {
      setFormData((f) => ({ ...f, contratoId, clienteId: contrato.clienteId! }));
    }
  }

  // ── Move Card ───────────────────────────────────────────────

  async function handleMoveCard(cardId: string, novaColunaId: string) {
    try {
      const res = await fetch(`/api/kanban/cards/${cardId}/mover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colunaId: novaColunaId }),
      });
      if (!res.ok) throw new Error("Erro ao mover card");
      const updatedBoard = await fetch(`/api/kanban?escritorioId=${escritorioId}`).then((r) => r.json()) as KanbanBoard;
      setBoard(updatedBoard);
      if (selectedCard?.id === cardId) {
        setSelectedCardColunaId(novaColunaId);
        const updatedCard = updatedBoard.colunas
          .flatMap((col) => col.cards)
          .find((c) => c.id === cardId);
        if (updatedCard) setSelectedCard(updatedCard);
      }
    } catch {
      alert("Erro ao mover card.");
    }
  }

  // ── Toggle Checklist ────────────────────────────────────────

  async function handleToggleChecklist(checklistId: string, feito: boolean) {
    try {
      const res = await fetch(`/api/kanban/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feito }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar checklist");
      const updatedBoard = await fetch(`/api/kanban?escritorioId=${escritorioId}`).then((r) => r.json()) as KanbanBoard;
      setBoard(updatedBoard);
      if (selectedCard) {
        const updatedCard = updatedBoard.colunas
          .flatMap((col) => col.cards)
          .find((c) => c.id === selectedCard.id);
        if (updatedCard) setSelectedCard(updatedCard);
      }
    } catch {
      alert("Erro ao atualizar checklist.");
    }
  }

  function openCardDetail(card: KanbanCard, colunaId: string) {
    setSelectedCard(card);
    setSelectedCardColunaId(colunaId);
  }

  function closeCardDetail() {
    setSelectedCard(null);
    setSelectedCardColunaId("");
  }

  // ── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-red-600">{erro}</p>
        <button
          onClick={() => { setLoading(true); fetchBoard(); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Fluxo de Rescisão</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
        >
          {showForm ? (
            "Cancelar"
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nova Rescisão
            </>
          )}
        </button>
      </div>

      {/* Nova Rescisão Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Nova Rescisão</h2>
          <form onSubmit={handleCreateCard} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contratoId" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contrato
                </label>
                {contratos.length > 0 ? (
                  <select
                    id="contratoId"
                    required
                    value={formData.contratoId}
                    onChange={(e) => handleContratoChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Selecione um contrato</option>
                    {contratos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.identificador || c.contratante || c.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="contratoId"
                    type="text"
                    required
                    value={formData.contratoId}
                    onChange={(e) => setFormData((f) => ({ ...f, contratoId: e.target.value }))}
                    placeholder="ID do contrato"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                )}
              </div>
              <div>
                <label htmlFor="clienteId" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cliente
                </label>
                {clientes.length > 0 ? (
                  <select
                    id="clienteId"
                    required
                    value={formData.clienteId}
                    onChange={(e) => setFormData((f) => ({ ...f, clienteId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razaoSocial}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="clienteId"
                    type="text"
                    required
                    value={formData.clienteId}
                    onChange={(e) => setFormData((f) => ({ ...f, clienteId: e.target.value }))}
                    placeholder="ID do cliente"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                )}
              </div>
            </div>
            <div>
              <label htmlFor="motivo" className="mb-1.5 block text-sm font-medium text-slate-700">
                Motivo
              </label>
              <textarea
                id="motivo"
                rows={3}
                value={formData.motivo}
                onChange={(e) => setFormData((f) => ({ ...f, motivo: e.target.value }))}
                placeholder="Motivo da rescisão (opcional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Criando..." : "Criar Rescisão"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board */}
      {board && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.colunas.map((coluna) => (
            <div
              key={coluna.id}
              className="flex min-w-[300px] flex-col rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm"
            >
              {/* Column Header */}
              <div
                className="rounded-t-xl border-b border-slate-200 px-4 py-3"
                style={{ borderTopWidth: "3px", borderTopColor: coluna.cor || "#94A3B8" }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">{coluna.nome}</h3>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
                    {coluna.cards.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 p-3">
                {coluna.cards.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">Nenhum card</p>
                )}
                {coluna.cards.map((card) => {
                  const checkDone = card.checklists.filter((c) => c.feito).length;
                  const checkTotal = card.checklists.length;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => openCardDetail(card, coluna.id)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {card.cliente?.razaoSocial || "Cliente não identificado"}
                      </p>
                      {card.contrato?.identificador && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {card.contrato.identificador}
                        </p>
                      )}
                      {card.motivo && (
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{card.motivo}</p>
                      )}
                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                        <span>{formatDate(card.createdAt)}</span>
                        {checkTotal > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                            {checkDone}/{checkTotal}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && board && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCardDetail();
          }}
        >
          <div className="mx-4 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedCard.cliente?.razaoSocial || "Cliente não identificado"}
                </h2>
                {selectedCard.contrato?.identificador && (
                  <p className="text-sm text-slate-500">{selectedCard.contrato.identificador}</p>
                )}
              </div>
              <button
                onClick={closeCardDetail}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info */}
            <div className="mb-5 space-y-2 text-sm text-slate-600">
              {selectedCard.motivo && (
                <p><span className="font-medium text-slate-700">Motivo:</span> {selectedCard.motivo}</p>
              )}
              <p><span className="font-medium text-slate-700">Data de solicitação:</span> {formatDate(selectedCard.createdAt)}</p>
              {selectedCard.dataPrevisao && (
                <p><span className="font-medium text-slate-700">Previsão:</span> {formatDate(selectedCard.dataPrevisao)}</p>
              )}
            </div>

            {/* Move to Column */}
            <div className="mb-5">
              <label htmlFor="moverColuna" className="mb-1.5 block text-sm font-medium text-slate-700">
                Mover para coluna
              </label>
              <select
                id="moverColuna"
                value={selectedCardColunaId}
                onChange={(e) => handleMoveCard(selectedCard.id, e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {board.colunas.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist */}
            {selectedCard.checklists.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  Checklist ({selectedCard.checklists.filter((c) => c.feito).length}/{selectedCard.checklists.length})
                </h3>
                <div className="space-y-1">
                  {selectedCard.checklists.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={item.feito}
                        onChange={() => handleToggleChecklist(item.id, !item.feito)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span className={item.feito ? "text-slate-400 line-through" : "text-slate-700"}>
                        {item.descricao}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
