"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DateInput } from "@/components/ui/DateInput";
import { CnpjInput } from "@/components/ui/CnpjInput";
import { EmailInput } from "@/components/ui/EmailInput";

interface ContratoGerado {
  id: string;
  identificador: string | null;
  dados: Record<string, string>;
  status: string;
  emailDestinatario: string | null;
  dataEnvio: string | null;
  createdAt: string;
  updatedAt: string;
  conteudoHtml: string;
}

interface Modelo {
  id: string;
  nome: string;
  descricao: string | null;
  conteudoHtml: string;
  variaveis: string[];
  createdAt: string;
  updatedAt: string;
  gerados: ContratoGerado[];
}

const STATUS_COR: Record<string, string> = {
  rascunho: "bg-yellow-100 text-yellow-700",
  enviado: "bg-blue-100 text-blue-700",
  assinado: "bg-green-100 text-green-700",
};

// Detectar o tipo de campo pela nome da variável
function getTipoCampo(varName: string): "date" | "cnpj" | "email" | "text" {
  const lower = varName.toLowerCase();
  if (lower.includes("data") || lower.includes("date") || lower.includes("vencimento") || lower.includes("nascimento")) return "date";
  if (lower.includes("cnpj")) return "cnpj";
  if (lower.includes("email") || lower.includes("e_mail")) return "email";
  return "text";
}

function labelFromVar(varName: string): string {
  return varName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ModeloDetalhe({ modelo }: { modelo: Modelo }) {
  const router = useRouter();
  const [dados, setDados] = useState<Record<string, string>>(
    Object.fromEntries(modelo.variaveis.map((v) => [v, ""]))
  );
  const [identificador, setIdentificador] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [enviarModal, setEnviarModal] = useState<ContratoGerado | null>(null);
  const [emailEnvio, setEmailEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);

  function updateDado(key: string, value: string | null) {
    setDados((prev) => ({ ...prev, [key]: value ?? "" }));
  }

  function gerarPreview() {
    let html = modelo.conteudoHtml;
    for (const [key, value] of Object.entries(dados)) {
      html = html.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        value || `<span style="background:yellow">[${labelFromVar(key)}]</span>`
      );
    }
    setPreviewHtml(html);
  }

  async function gerarContrato() {
    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      const res = await fetch(`/api/modelos/${modelo.id}/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificador: identificador || null,
          dados,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.erro ?? "Erro ao gerar contrato.");
      }

      setSucesso("Contrato gerado com sucesso!");
      setDados(Object.fromEntries(modelo.variaveis.map((v) => [v, ""])));
      setIdentificador("");
      setPreviewHtml(null);
      router.refresh();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  }

  async function enviarPorEmail() {
    if (!enviarModal) return;
    if (!emailEnvio.trim()) {
      setErro("Informe o e-mail do destinatário.");
      return;
    }
    setEnviando(true);
    setErro(null);

    try {
      const res = await fetch(`/api/modelos/${modelo.id}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoGeradoId: enviarModal.id,
          email: emailEnvio.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.erro ?? "Erro ao enviar.");
      }

      setSucesso(`Contrato enviado para ${emailEnvio} com sucesso!`);
      setEnviarModal(null);
      setEmailEnvio("");
      router.refresh();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  function imprimirGerado(g: ContratoGerado) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato - ${g.identificador ?? modelo.nome}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
          @media print { body { margin: 0; padding: 20px; } }
        </style>
      </head>
      <body>${g.conteudoHtml}</body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{modelo.nome}</h1>
        {modelo.descricao && <p className="text-sm text-gray-500">{modelo.descricao}</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {modelo.variaveis.map((v) => (
            <span key={v} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{`{{${v}}}`}</span>
          ))}
        </div>
      </div>

      {/* Formulário de preenchimento */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Preencher Campos</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Identificador do Contrato</label>
          <input
            type="text"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Ex: CONTRATO-2024-001"
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {modelo.variaveis.map((v) => {
            const tipo = getTipoCampo(v);
            const label = labelFromVar(v);

            if (tipo === "date") {
              return (
                <DateInput
                  key={v}
                  label={label}
                  value={dados[v] || null}
                  onChange={(val) => updateDado(v, val)}
                />
              );
            }

            if (tipo === "cnpj") {
              return (
                <CnpjInput
                  key={v}
                  label={label}
                  value={dados[v] || null}
                  onChange={(val) => updateDado(v, val)}
                />
              );
            }

            if (tipo === "email") {
              return (
                <EmailInput
                  key={v}
                  label={label}
                  value={dados[v] || null}
                  onChange={(val) => updateDado(v, val)}
                />
              );
            }

            return (
              <div key={v}>
                <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                <input
                  type="text"
                  value={dados[v]}
                  onChange={(e) => updateDado(v, e.target.value)}
                  placeholder={label}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            );
          })}
        </div>

        {erro && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        )}
        {sucesso && (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{sucesso}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={gerarPreview}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Pré-visualizar
          </button>
          <button
            onClick={gerarContrato}
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando ? "Gerando..." : "Gerar Contrato"}
          </button>
        </div>
      </section>

      {/* Preview */}
      {previewHtml && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Pré-visualização</h2>
            <button
              onClick={() => setPreviewHtml(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Fechar
            </button>
          </div>
          <div
            className="prose prose-sm max-w-none rounded border border-gray-100 bg-gray-50 p-4"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
      )}

      {/* Contratos Gerados */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-800">
          Contratos Gerados ({modelo.gerados.length})
        </h2>
        {modelo.gerados.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum contrato gerado a partir deste modelo.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Identificador</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">E-mail</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Criado em</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modelo.gerados.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {g.identificador ?? <span className="text-gray-400 italic">Sem ID</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COR[g.status]}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {g.emailDestinatario ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {format(new Date(g.createdAt), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => imprimirGerado(g)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          PDF
                        </button>
                        {g.status === "rascunho" && (
                          <button
                            onClick={() => { setEnviarModal(g); setEmailEnvio(g.emailDestinatario ?? ""); }}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Enviar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de envio */}
      {enviarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="font-semibold text-gray-800">Enviar para Assinatura</h2>
            <p className="text-sm text-gray-500">
              O contrato será enviado por e-mail para o destinatário assinar.
            </p>
            <EmailInput
              label="E-mail do Destinatário"
              value={emailEnvio || null}
              onChange={(v) => setEmailEnvio(v ?? "")}
              required
            />
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <div className="flex gap-2">
              <button
                onClick={enviarPorEmail}
                disabled={enviando}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {enviando ? "Enviando..." : "Enviar"}
              </button>
              <button
                onClick={() => { setEnviarModal(null); setErro(null); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
