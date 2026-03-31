"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { applyDateMask, isValidDateBR } from "@/lib/validators";

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
  observacao: string | null;
  createdAt: string;
  dataPrevisao: string | null;
  contrato: { identificador: string | null; contratante: string | null; contratado: string | null };
  cliente: { razaoSocial: string | null; email?: string | null };
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

function isoToDateBR(iso: string | null): string {
  if (!iso) return "";
  try {
    return formatDate(iso);
  } catch {
    return "";
  }
}

function dateBRToISO(dateBR: string): string | null {
  if (!isValidDateBR(dateBR)) return null;
  const [d, m, y] = dateBR.split("/");
  return `${y}-${m}-${d}`;
}

// ─── Email Templates ───────────────────────────────────────────

interface EmailTemplate {
  assunto: string;
  corpo: string;
}

function getEmailTemplate(
  colunaNome: string,
  card: KanbanCard
): EmailTemplate {
  const identificador = card.contrato?.identificador || "[não informado]";
  const motivo = card.motivo || "[não informado]";
  const dataPrevisao = card.dataPrevisao
    ? formatDate(card.dataPrevisao)
    : "[não informada]";

  const templates: Record<string, EmailTemplate> = {
    Solicitado: {
      assunto: "Notificação de Rescisão Contratual",
      corpo: `Prezado(a),\n\nInformamos que foi iniciado o processo de rescisão do contrato ${identificador}.\n\nMotivo: ${motivo}\n\nFicamos à disposição para esclarecimentos.`,
    },
    "Aviso Enviado": {
      assunto: "Aviso Prévio de Rescisão",
      corpo: `Prezado(a),\n\nConforme comunicado anteriormente, segue o aviso prévio referente à rescisão do contrato ${identificador}.\n\nData prevista: ${dataPrevisao}\n\nSolicitamos os encaminhamentos necessários.`,
    },
    "Distrato Gerado": {
      assunto: "Distrato Contratual - Documento Gerado",
      corpo: `Prezado(a),\n\nO distrato referente ao contrato ${identificador} foi gerado.\n\nSolicitamos a análise e assinatura do documento em anexo.`,
    },
    "Obrigações Pendentes": {
      assunto: "Obrigações Pendentes - Rescisão Contratual",
      corpo: `Prezado(a),\n\nExistem obrigações pendentes referentes à rescisão do contrato ${identificador}.\n\nSolicitamos a regularização para conclusão do processo.`,
    },
    "Baixa Concluída": {
      assunto: "Conclusão da Rescisão Contratual",
      corpo: `Prezado(a),\n\nInformamos que o processo de rescisão do contrato ${identificador} foi concluído com sucesso.\n\nAgradecemos a colaboração.`,
    },
  };

  return (
    templates[colunaNome] || {
      assunto: "Rescisão Contratual",
      corpo: `Prezado(a),\n\nSegue informação referente à rescisão do contrato ${identificador}.`,
    }
  );
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

  // Card editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editMotivo, setEditMotivo] = useState("");
  const [editObservacao, setEditObservacao] = useState("");
  const [editDataPrevisao, setEditDataPrevisao] = useState("");
  const [editDateError, setEditDateError] = useState("");
  const [saving, setSaving] = useState(false);

  // Email state
  const [showEmail, setShowEmail] = useState(false);
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [emailAssunto, setEmailAssunto] = useState("");
  const [emailCorpo, setEmailCorpo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Delete card
  const [deletingCard, setDeletingCard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Checklist editing
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistDesc, setEditingChecklistDesc] = useState("");

  // Column editing
  const [editingColunaId, setEditingColunaId] = useState<string | null>(null);
  const [editingColunaNome, setEditingColunaNome] = useState("");

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

  // ── Edit Card ─────────────────────────────────────────────

  function startEditing() {
    if (!selectedCard) return;
    setEditMotivo(selectedCard.motivo ?? "");
    setEditObservacao(selectedCard.observacao ?? "");
    setEditDataPrevisao(isoToDateBR(selectedCard.dataPrevisao));
    setEditDateError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditDateError("");
  }

  async function handleSaveCard() {
    if (!selectedCard) return;

    // Validate date if provided
    if (editDataPrevisao && !isValidDateBR(editDataPrevisao)) {
      setEditDateError("Data inválida. Use DD/MM/AAAA.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        motivo: editMotivo || null,
        observacao: editObservacao || null,
      };
      if (editDataPrevisao) {
        payload.dataPrevisao = dateBRToISO(editDataPrevisao);
      } else {
        payload.dataPrevisao = null;
      }

      const res = await fetch(`/api/kanban/cards/${selectedCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao salvar card");

      const updatedBoard = await fetch(`/api/kanban?escritorioId=${escritorioId}`).then((r) => r.json()) as KanbanBoard;
      setBoard(updatedBoard);
      const updatedCard = updatedBoard.colunas
        .flatMap((col) => col.cards)
        .find((c) => c.id === selectedCard.id);
      if (updatedCard) setSelectedCard(updatedCard);
      setIsEditing(false);
    } catch {
      alert("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }

  function openEmailSection() {
    if (!selectedCard || !board) return;
    const coluna = board.colunas.find((c) => c.id === selectedCardColunaId);
    const template = getEmailTemplate(coluna?.nome ?? "", selectedCard);
    setEmailDestinatario(selectedCard.cliente?.email ?? "");
    setEmailAssunto(template.assunto);
    setEmailCorpo(template.corpo);
    setEmailMsg(null);
    setShowEmail(true);
  }

  async function handleSendEmail() {
    if (!selectedCard) return;
    setSendingEmail(true);
    setEmailMsg(null);
    try {
      const res = await fetch(`/api/kanban/cards/${selectedCard.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinatario: emailDestinatario,
          assunto: emailAssunto,
          corpo: emailCorpo,
          escritorioId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao enviar email");
      setEmailMsg({ tipo: "sucesso", texto: "Email enviado com sucesso!" });
    } catch (err) {
      setEmailMsg({ tipo: "erro", texto: err instanceof Error ? err.message : "Erro ao enviar" });
    } finally {
      setSendingEmail(false);
    }
  }

  function openCardDetail(card: KanbanCard, colunaId: string) {
    setSelectedCard(card);
    setSelectedCardColunaId(colunaId);
    setIsEditing(false);
    setShowEmail(false);
    setEmailMsg(null);
  }

  function closeCardDetail() {
    setSelectedCard(null);
    setSelectedCardColunaId("");
    setIsEditing(false);
    setConfirmDelete(false);
  }

  // ── Delete Card ───────────────────────────────────────────
  async function handleDeleteCard() {
    if (!selectedCard) return;
    setDeletingCard(true);
    try {
      const res = await fetch(`/api/kanban/cards/${selectedCard.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir card");
      closeCardDetail();
      await fetchBoard();
    } catch {
      alert("Erro ao excluir card.");
    } finally {
      setDeletingCard(false);
      setConfirmDelete(false);
    }
  }

  // ── Edit Checklist Description ────────────────────────────
  async function handleSaveChecklistDesc(checklistId: string) {
    if (!editingChecklistDesc.trim()) return;
    try {
      const res = await fetch(`/api/kanban/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: editingChecklistDesc.trim() }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar checklist");
      setEditingChecklistId(null);
      const updatedBoard = await fetch(`/api/kanban?escritorioId=${escritorioId}`).then((r) => r.json()) as KanbanBoard;
      setBoard(updatedBoard);
      if (selectedCard) {
        const updatedCard = updatedBoard.colunas.flatMap((col) => col.cards).find((c) => c.id === selectedCard.id);
        if (updatedCard) setSelectedCard(updatedCard);
      }
    } catch {
      alert("Erro ao atualizar checklist.");
    }
  }

  async function handleDeleteChecklist(checklistId: string) {
    try {
      const res = await fetch(`/api/kanban/checklists/${checklistId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir checklist");
      const updatedBoard = await fetch(`/api/kanban?escritorioId=${escritorioId}`).then((r) => r.json()) as KanbanBoard;
      setBoard(updatedBoard);
      if (selectedCard) {
        const updatedCard = updatedBoard.colunas.flatMap((col) => col.cards).find((c) => c.id === selectedCard.id);
        if (updatedCard) setSelectedCard(updatedCard);
      }
    } catch {
      alert("Erro ao excluir item do checklist.");
    }
  }

  // ── Column Rename / Delete ────────────────────────────────
  async function handleRenameColuna(colunaId: string) {
    if (!editingColunaNome.trim()) return;
    try {
      const res = await fetch(`/api/kanban/colunas/${colunaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editingColunaNome.trim() }),
      });
      if (!res.ok) throw new Error("Erro ao renomear coluna");
      setEditingColunaId(null);
      await fetchBoard();
    } catch {
      alert("Erro ao renomear coluna.");
    }
  }

  async function handleDeleteColuna(colunaId: string) {
    if (!confirm("Tem certeza que deseja excluir esta coluna? A coluna deve estar vazia.")) return;
    try {
      const res = await fetch(`/api/kanban/colunas/${colunaId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.erro || "Erro ao excluir coluna.");
        return;
      }
      await fetchBoard();
    } catch {
      alert("Erro ao excluir coluna.");
    }
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
                <div className="flex items-center justify-between gap-2">
                  {editingColunaId === coluna.id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRenameColuna(coluna.id); }}
                      className="flex items-center gap-1 flex-1"
                    >
                      <input
                        autoFocus
                        value={editingColunaNome}
                        onChange={(e) => setEditingColunaNome(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") setEditingColunaId(null); }}
                        className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      <button type="submit" className="text-blue-600 hover:text-blue-700" title="Salvar">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      </button>
                      <button type="button" onClick={() => setEditingColunaId(null)} className="text-slate-400 hover:text-slate-600" title="Cancelar">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    </form>
                  ) : (
                    <h3
                      className="text-sm font-semibold text-slate-800 cursor-pointer hover:text-blue-600"
                      onDoubleClick={() => { setEditingColunaId(coluna.id); setEditingColunaNome(coluna.nome); }}
                      title="Duplo clique para renomear"
                    >
                      {coluna.nome}
                    </h3>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
                      {coluna.cards.length}
                    </span>
                    {coluna.cards.length === 0 && (
                      <button
                        onClick={() => handleDeleteColuna(coluna.id)}
                        className="rounded p-0.5 text-slate-300 hover:text-red-500"
                        title="Excluir coluna"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                    )}
                  </div>
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
          <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
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
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    title="Editar card"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  title="Excluir card"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
                <button
                  onClick={closeCardDetail}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Delete Confirmation */}
            {confirmDelete && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700 mb-2">Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteCard}
                    disabled={deletingCard}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingCard ? "Excluindo..." : "Confirmar Exclusão"}
                  </button>
                </div>
              </div>
            )}

            {/* Info / Edit Mode */}
            {isEditing ? (
              <div className="mb-5 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
                  <textarea
                    rows={3}
                    value={editMotivo}
                    onChange={(e) => setEditMotivo(e.target.value)}
                    placeholder="Motivo da rescisão"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Data de Previsão</label>
                  <input
                    type="text"
                    value={editDataPrevisao}
                    onChange={(e) => {
                      setEditDataPrevisao(applyDateMask(e.target.value));
                      setEditDateError("");
                    }}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                      ${editDateError ? "border-red-300 bg-red-50" : "border-slate-300 focus:border-blue-500"}`}
                  />
                  {editDateError && <p className="mt-0.5 text-xs text-red-500">{editDateError}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Observação</label>
                  <textarea
                    rows={3}
                    value={editObservacao}
                    onChange={(e) => setEditObservacao(e.target.value)}
                    placeholder="Observações adicionais"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEditing}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCard}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-5 space-y-2 text-sm text-slate-600">
                {selectedCard.motivo && (
                  <p><span className="font-medium text-slate-700">Motivo:</span> {selectedCard.motivo}</p>
                )}
                <p><span className="font-medium text-slate-700">Data de solicitação:</span> {formatDate(selectedCard.createdAt)}</p>
                {selectedCard.dataPrevisao && (
                  <p><span className="font-medium text-slate-700">Previsão:</span> {formatDate(selectedCard.dataPrevisao)}</p>
                )}
                {selectedCard.observacao && (
                  <p><span className="font-medium text-slate-700">Observação:</span> {selectedCard.observacao}</p>
                )}
              </div>
            )}

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

            {/* Email Section */}
            <div className="mb-5">
              {!showEmail ? (
                <button
                  onClick={openEmailSection}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 w-full justify-center"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  Enviar Email
                </button>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700">Enviar Email</h3>
                    <button onClick={() => setShowEmail(false)} className="text-xs text-slate-400 hover:text-slate-600">Fechar</button>
                  </div>
                  {emailMsg && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-medium ${emailMsg.tipo === "sucesso" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {emailMsg.texto}
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Destinatário</label>
                    <input
                      type="email"
                      value={emailDestinatario}
                      onChange={(e) => setEmailDestinatario(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Assunto</label>
                    <input
                      type="text"
                      value={emailAssunto}
                      onChange={(e) => setEmailAssunto(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Corpo</label>
                    <textarea
                      rows={5}
                      value={emailCorpo}
                      onChange={(e) => setEmailCorpo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !emailDestinatario}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sendingEmail ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              )}
            </div>

            {/* Checklist */}
            {selectedCard.checklists.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  Checklist ({selectedCard.checklists.filter((c) => c.feito).length}/{selectedCard.checklists.length})
                </h3>
                <div className="space-y-1">
                  {selectedCard.checklists.map((item) => (
                    <div key={item.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={item.feito}
                        onChange={() => handleToggleChecklist(item.id, !item.feito)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 shrink-0"
                      />
                      {editingChecklistId === item.id ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleSaveChecklistDesc(item.id); }}
                          className="flex items-center gap-1 flex-1"
                        >
                          <input
                            autoFocus
                            value={editingChecklistDesc}
                            onChange={(e) => setEditingChecklistDesc(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") setEditingChecklistId(null); }}
                            className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <button type="submit" className="text-blue-600 hover:text-blue-700">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                          </button>
                        </form>
                      ) : (
                        <span
                          className={`flex-1 cursor-pointer ${item.feito ? "text-slate-400 line-through" : "text-slate-700"}`}
                          onDoubleClick={() => { setEditingChecklistId(item.id); setEditingChecklistDesc(item.descricao); }}
                          title="Duplo clique para editar"
                        >
                          {item.descricao}
                        </span>
                      )}
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        {editingChecklistId !== item.id && (
                          <button
                            onClick={() => { setEditingChecklistId(item.id); setEditingChecklistDesc(item.descricao); }}
                            className="rounded p-0.5 text-slate-300 hover:text-blue-500"
                            title="Editar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteChecklist(item.id)}
                          className="rounded p-0.5 text-slate-300 hover:text-red-500"
                          title="Excluir"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
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
