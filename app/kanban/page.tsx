"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  texto: string;
  feito: boolean;
}

interface Card {
  id: string;
  titulo: string;
  descricao: string;
  checklist: ChecklistItem[];
}

interface Coluna {
  id: string;
  titulo: string;
  cards: Card[];
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const COLUNAS_PADRAO: Coluna[] = [
  { id: uid(), titulo: "A Fazer", cards: [] },
  { id: uid(), titulo: "Em Progresso", cards: [] },
  { id: uid(), titulo: "Concluído", cards: [] },
];

const STORAGE_KEY = "kanban_colunas";

// ── Component ─────────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Carrega do localStorage
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      setColunas(salvo ? JSON.parse(salvo) : COLUNAS_PADRAO);
    } catch {
      setColunas(COLUNAS_PADRAO);
    }
    setCarregado(true);
  }, []);

  // Salva no localStorage sempre que muda
  useEffect(() => {
    if (carregado) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colunas));
    }
  }, [colunas, carregado]);

  // ── Coluna ────────────────────────────────────────────────────────────────

  function adicionarColuna() {
    setColunas((prev) => [
      ...prev,
      { id: uid(), titulo: "Nova Coluna", cards: [] },
    ]);
  }

  function renomearColuna(colunaId: string, novoTitulo: string) {
    setColunas((prev) =>
      prev.map((c) => (c.id === colunaId ? { ...c, titulo: novoTitulo } : c))
    );
  }

  function excluirColuna(colunaId: string) {
    setColunas((prev) => prev.filter((c) => c.id !== colunaId));
  }

  // ── Card ─────────────────────────────────────────────────────────────────

  function adicionarCard(colunaId: string) {
    setColunas((prev) =>
      prev.map((c) =>
        c.id === colunaId
          ? {
              ...c,
              cards: [
                ...c.cards,
                { id: uid(), titulo: "Novo Card", descricao: "", checklist: [] },
              ],
            }
          : c
      )
    );
  }

  function atualizarCard(colunaId: string, cardId: string, campo: keyof Card, valor: string) {
    setColunas((prev) =>
      prev.map((c) =>
        c.id === colunaId
          ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId ? { ...card, [campo]: valor } : card
              ),
            }
          : c
      )
    );
  }

  function excluirCard(colunaId: string, cardId: string) {
    setColunas((prev) =>
      prev.map((c) =>
        c.id === colunaId
          ? { ...c, cards: c.cards.filter((card) => card.id !== cardId) }
          : c
      )
    );
  }

  function moverCard(colunaOrigemId: string, cardId: string, direcao: "esquerda" | "direita") {
    const idxOrigem = colunas.findIndex((c) => c.id === colunaOrigemId);
    const idxDestino = direcao === "esquerda" ? idxOrigem - 1 : idxOrigem + 1;
    if (idxDestino < 0 || idxDestino >= colunas.length) return;

    const card = colunas[idxOrigem].cards.find((card) => card.id === cardId);
    if (!card) return;

    setColunas((prev) =>
      prev.map((c, idx) => {
        if (idx === idxOrigem) return { ...c, cards: c.cards.filter((ca) => ca.id !== cardId) };
        if (idx === idxDestino) return { ...c, cards: [...c.cards, card] };
        return c;
      })
    );
  }

  // ── Checklist ─────────────────────────────────────────────────────────────

  function adicionarChecklist(colunaId: string, cardId: string) {
    setColunas((prev) =>
      prev.map((c) =>
        c.id === colunaId
          ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId
                  ? {
                      ...card,
                      checklist: [
                        ...card.checklist,
                        { id: uid(), texto: "Novo item", feito: false },
                      ],
                    }
                  : card
              ),
            }
          : c
      )
    );
  }

  function atualizarChecklist(
    colunaId: string,
    cardId: string,
    itemId: string,
    campo: "texto" | "feito",
    valor: string | boolean
  ) {
    setColunas((prev) =>
      prev.map((c) =>
        c.id === colunaId
          ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId
                  ? {
                      ...card,
                      checklist: card.checklist.map((item) =>
                        item.id === itemId ? { ...item, [campo]: valor } : item
                      ),
                    }
                  : card
              ),
            }
          : c
      )
    );
  }

  function excluirChecklist(colunaId: string, cardId: string, itemId: string) {
    setColunas((prev) =>
      prev.map((c) =>
        c.id === colunaId
          ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId
                  ? { ...card, checklist: card.checklist.filter((item) => item.id !== itemId) }
                  : card
              ),
            }
          : c
      )
    );
  }

  if (!carregado) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quadro Kanban</h1>
          <p className="text-sm text-gray-500">
            {colunas.length} coluna(s) · {colunas.reduce((acc, c) => acc + c.cards.length, 0)} card(s)
          </p>
        </div>
        <button
          onClick={adicionarColuna}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova Coluna
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
        {colunas.map((coluna, colunaIdx) => (
          <ColunaComponent
            key={coluna.id}
            coluna={coluna}
            isFirst={colunaIdx === 0}
            isLast={colunaIdx === colunas.length - 1}
            onRenomear={(titulo) => renomearColuna(coluna.id, titulo)}
            onExcluir={() => excluirColuna(coluna.id)}
            onAdicionarCard={() => adicionarCard(coluna.id)}
            onExcluirCard={(cardId) => excluirCard(coluna.id, cardId)}
            onAtualizarCard={(cardId, campo, valor) =>
              atualizarCard(coluna.id, cardId, campo, valor)
            }
            onMoverCard={(cardId, dir) => moverCard(coluna.id, cardId, dir)}
            onAdicionarChecklist={(cardId) => adicionarChecklist(coluna.id, cardId)}
            onAtualizarChecklist={(cardId, itemId, campo, valor) =>
              atualizarChecklist(coluna.id, cardId, itemId, campo, valor)
            }
            onExcluirChecklist={(cardId, itemId) =>
              excluirChecklist(coluna.id, cardId, itemId)
            }
          />
        ))}

        {colunas.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">
            Nenhuma coluna. Clique em &quot;+ Nova Coluna&quot; para começar.
          </div>
        )}
      </div>
    </div>
  );
}

// ── ColunaComponent ───────────────────────────────────────────────────────────

function ColunaComponent({
  coluna,
  isFirst,
  isLast,
  onRenomear,
  onExcluir,
  onAdicionarCard,
  onExcluirCard,
  onAtualizarCard,
  onMoverCard,
  onAdicionarChecklist,
  onAtualizarChecklist,
  onExcluirChecklist,
}: {
  coluna: Coluna;
  isFirst: boolean;
  isLast: boolean;
  onRenomear: (titulo: string) => void;
  onExcluir: () => void;
  onAdicionarCard: () => void;
  onExcluirCard: (cardId: string) => void;
  onAtualizarCard: (cardId: string, campo: keyof Card, valor: string) => void;
  onMoverCard: (cardId: string, dir: "esquerda" | "direita") => void;
  onAdicionarChecklist: (cardId: string) => void;
  onAtualizarChecklist: (cardId: string, itemId: string, campo: "texto" | "feito", valor: string | boolean) => void;
  onExcluirChecklist: (cardId: string, itemId: string) => void;
}) {
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloTemp, setTituloTemp] = useState(coluna.titulo);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editandoTitulo) inputRef.current?.focus();
  }, [editandoTitulo]);

  function salvarTitulo() {
    onRenomear(tituloTemp.trim() || coluna.titulo);
    setEditandoTitulo(false);
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50">
      {/* Header da coluna */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
        {editandoTitulo ? (
          <input
            ref={inputRef}
            value={tituloTemp}
            onChange={(e) => setTituloTemp(e.target.value)}
            onBlur={salvarTitulo}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvarTitulo();
              if (e.key === "Escape") { setTituloTemp(coluna.titulo); setEditandoTitulo(false); }
            }}
            className="flex-1 rounded border border-blue-300 bg-white px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        ) : (
          <button
            onClick={() => { setTituloTemp(coluna.titulo); setEditandoTitulo(true); }}
            className="flex-1 text-left text-sm font-semibold text-gray-800 hover:text-blue-600"
            title="Clique para renomear"
          >
            {coluna.titulo}
          </button>
        )}
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
          {coluna.cards.length}
        </span>
        {confirmandoExcluir ? (
          <div className="flex gap-1">
            <button
              onClick={onExcluir}
              className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 hover:bg-red-200"
            >
              Excluir
            </button>
            <button
              onClick={() => setConfirmandoExcluir(false)}
              className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoExcluir(true)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Excluir coluna"
          >
            ✕
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {coluna.cards.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            isFirst={isFirst}
            isLast={isLast}
            onExcluir={() => onExcluirCard(card.id)}
            onAtualizar={(campo, valor) => onAtualizarCard(card.id, campo, valor)}
            onMover={(dir) => onMoverCard(card.id, dir)}
            onAdicionarChecklist={() => onAdicionarChecklist(card.id)}
            onAtualizarChecklist={(itemId, campo, valor) =>
              onAtualizarChecklist(card.id, itemId, campo, valor)
            }
            onExcluirChecklist={(itemId) => onExcluirChecklist(card.id, itemId)}
          />
        ))}
      </div>

      {/* Footer da coluna */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={onAdicionarCard}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          + Adicionar card
        </button>
      </div>
    </div>
  );
}

// ── CardComponent ─────────────────────────────────────────────────────────────

function CardComponent({
  card,
  isFirst,
  isLast,
  onExcluir,
  onAtualizar,
  onMover,
  onAdicionarChecklist,
  onAtualizarChecklist,
  onExcluirChecklist,
}: {
  card: Card;
  isFirst: boolean;
  isLast: boolean;
  onExcluir: () => void;
  onAtualizar: (campo: keyof Card, valor: string) => void;
  onMover: (dir: "esquerda" | "direita") => void;
  onAdicionarChecklist: () => void;
  onAtualizarChecklist: (itemId: string, campo: "texto" | "feito", valor: string | boolean) => void;
  onExcluirChecklist: (itemId: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);

  const totalChecklist = card.checklist.length;
  const feitosChecklist = card.checklist.filter((i) => i.feito).length;
  const progresso = totalChecklist > 0 ? (feitosChecklist / totalChecklist) * 100 : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Cabeçalho do card */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {editandoTitulo ? (
            <input
              autoFocus
              value={card.titulo}
              onChange={(e) => onAtualizar("titulo", e.target.value)}
              onBlur={() => setEditandoTitulo(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditandoTitulo(false); }}
              className="flex-1 rounded border border-blue-300 px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          ) : (
            <button
              onClick={() => setEditandoTitulo(true)}
              className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-blue-600"
              title="Clique para editar"
            >
              {card.titulo}
            </button>
          )}

          <div className="flex items-center gap-1">
            {/* Mover */}
            {!isFirst && (
              <button
                onClick={() => onMover("esquerda")}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xs"
                title="Mover para esquerda"
              >
                ←
              </button>
            )}
            {!isLast && (
              <button
                onClick={() => onMover("direita")}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xs"
                title="Mover para direita"
              >
                →
              </button>
            )}
            {/* Expandir */}
            <button
              onClick={() => setExpandido((p) => !p)}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xs"
              title={expandido ? "Recolher" : "Expandir"}
            >
              {expandido ? "▲" : "▼"}
            </button>
            {/* Excluir */}
            {confirmandoExcluir ? (
              <>
                <button
                  onClick={onExcluir}
                  className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-200"
                >
                  Excluir
                </button>
                <button
                  onClick={() => setConfirmandoExcluir(false)}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmandoExcluir(true)}
                className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 text-xs"
                title="Excluir card"
              >
                🗑
              </button>
            )}
          </div>
        </div>

        {/* Barra de progresso da checklist */}
        {totalChecklist > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Checklist</span>
              <span>{feitosChecklist}/{totalChecklist}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          {/* Descrição */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Descrição</label>
            <textarea
              rows={2}
              value={card.descricao}
              onChange={(e) => onAtualizar("descricao", e.target.value)}
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Adicione uma descrição..."
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Checklist</label>
              <button
                onClick={onAdicionarChecklist}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
              >
                + Item
              </button>
            </div>
            <div className="space-y-1.5">
              {card.checklist.length === 0 && (
                <p className="text-xs text-gray-400">Nenhum item ainda.</p>
              )}
              {card.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.feito}
                    onChange={(e) => onAtualizarChecklist(item.id, "feito", e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-green-500"
                  />
                  <input
                    type="text"
                    value={item.texto}
                    onChange={(e) => onAtualizarChecklist(item.id, "texto", e.target.value)}
                    className={`flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs focus:border-gray-300 focus:outline-none focus:ring-0
                      ${item.feito ? "text-gray-400 line-through" : "text-gray-700"}`}
                  />
                  <button
                    onClick={() => onExcluirChecklist(item.id)}
                    className="text-gray-300 hover:text-red-400 text-xs"
                    title="Remover item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
