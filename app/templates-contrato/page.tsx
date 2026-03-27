"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { applyDateMask, isValidDateBR, applyCnpjMask, isValidCnpj, isValidEmail } from "@/lib/validators";

// ─── Types ──────────────────────────────────────────────────────

interface Template {
  id: string;
  nome: string;
  tipo: string;
  conteudo: string;
  variaveis: string[];
  ativo: boolean;
  createdAt: string;
}

interface ContratoGerado {
  id: string;
  identificador: string | null;
}

interface Signatario {
  nome: string;
  email: string;
  papel: string;
}

type Etapa = "lista" | "upload" | "preencher" | "gerando" | "enviar" | "enviando";

const TIPO_LABELS: Record<string, string> = {
  prestacao_servicos: "Prestação de Serviços",
  consultoria: "Consultoria",
  bpo: "BPO",
  aditivo: "Aditivo",
  distrato: "Distrato",
  custom: "Personalizado",
};

// ─── Component ──────────────────────────────────────────────────

export default function TemplatesContratoPage() {
  const router = useRouter();
  const { escritorioId } = useAuth();
  const [etapa, setEtapa] = useState<Etapa>("lista");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNome, setUploadNome] = useState("");
  const [uploadTipo, setUploadTipo] = useState("custom");
  const [uploading, setUploading] = useState(false);
  const [uploadErro, setUploadErro] = useState<string | null>(null);

  // Fill template state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [metaDados, setMetaDados] = useState({
    identificador: "",
    contratante: "",
    contratado: "",
    cnpjContratante: "",
    cnpjContratado: "",
    emailContratante: "",
    emailContratado: "",
    dataInicio: "",
    dataFim: "",
  });
  const [previewTexto, setPreviewTexto] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Generated contract
  const [contratoGerado, setContratoGerado] = useState<ContratoGerado | null>(null);

  // Send for signature state
  const [signatarios, setSignatarios] = useState<Signatario[]>([{ nome: "", email: "", papel: "contratante" }]);
  const [mensagemEnvio, setMensagemEnvio] = useState("");
  const [envioErro, setEnvioErro] = useState<string | null>(null);
  const [envioResultado, setEnvioResultado] = useState<string | null>(null);

  // ── Fetch Templates ─────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates-contrato?escritorioId=${escritorioId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [escritorioId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Upload Template ─────────────────────────────────────────

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadNome) return;
    setUploading(true);
    setUploadErro(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", uploadFile);
      formData.append("nome", uploadNome);
      formData.append("tipo", uploadTipo);
      formData.append("escritorioId", escritorioId);

      const res = await fetch("/api/templates-contrato/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.erro ?? "Erro ao fazer upload.");
      }

      setUploadFile(null);
      setUploadNome("");
      setUploadTipo("custom");
      setEtapa("lista");
      await fetchTemplates();
    } catch (err) {
      setUploadErro(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setUploading(false);
    }
  }

  // ── Select Template to Fill ─────────────────────────────────

  function selectTemplate(template: Template) {
    setSelectedTemplate(template);
    const initialValues: Record<string, string> = {};
    for (const v of template.variaveis) {
      initialValues[v] = "";
    }
    setValores(initialValues);
    setMetaDados({
      identificador: "",
      contratante: "",
      contratado: "",
      cnpjContratante: "",
      cnpjContratado: "",
      emailContratante: "",
      emailContratado: "",
      dataInicio: "",
      dataFim: "",
    });
    setValidationErrors({});
    updatePreview(template.conteudo, initialValues);
    setEtapa("preencher");
  }

  function updatePreview(conteudo: string, vals: Record<string, string>) {
    let preview = conteudo;
    for (const [key, value] of Object.entries(vals)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      preview = preview.replace(regex, value || `{{${key}}}`);
    }
    setPreviewTexto(preview);
  }

  function updateValor(key: string, value: string) {
    const newValores = { ...valores, [key]: value };
    setValores(newValores);
    if (selectedTemplate) {
      updatePreview(selectedTemplate.conteudo, newValores);
    }
  }

  // ── Validate and Generate ───────────────────────────────────

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (metaDados.cnpjContratante && !isValidCnpj(metaDados.cnpjContratante)) {
      errors.cnpjContratante = "CNPJ inválido.";
    }
    if (metaDados.cnpjContratado && !isValidCnpj(metaDados.cnpjContratado)) {
      errors.cnpjContratado = "CNPJ inválido.";
    }
    if (metaDados.emailContratante && !isValidEmail(metaDados.emailContratante)) {
      errors.emailContratante = "E-mail inválido.";
    }
    if (metaDados.emailContratado && !isValidEmail(metaDados.emailContratado)) {
      errors.emailContratado = "E-mail inválido.";
    }
    if (metaDados.dataInicio && !isValidDateBR(metaDados.dataInicio)) {
      errors.dataInicio = "Data inválida.";
    }
    if (metaDados.dataFim && !isValidDateBR(metaDados.dataFim)) {
      errors.dataFim = "Data inválida.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleGenerar() {
    if (!selectedTemplate) return;
    if (!validateForm()) return;

    setEtapa("gerando");
    try {
      const res = await fetch(`/api/templates-contrato/${selectedTemplate.id}/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valores,
          identificador: metaDados.identificador || null,
          contratante: metaDados.contratante || null,
          contratado: metaDados.contratado || null,
          cnpjContratante: metaDados.cnpjContratante || null,
          cnpjContratado: metaDados.cnpjContratado || null,
          emailContratante: metaDados.emailContratante || null,
          emailContratado: metaDados.emailContratado || null,
          dataInicio: metaDados.dataInicio || null,
          dataFim: metaDados.dataFim || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.erro ?? "Erro ao gerar contrato.");
      }

      const contrato = await res.json();
      setContratoGerado({ id: contrato.id, identificador: contrato.identificador });
      setEtapa("enviar");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar contrato.");
      setEtapa("preencher");
    }
  }

  // ── Send for Signature ──────────────────────────────────────

  function addSignatario() {
    setSignatarios([...signatarios, { nome: "", email: "", papel: "contratado" }]);
  }

  function removeSignatario(idx: number) {
    setSignatarios(signatarios.filter((_, i) => i !== idx));
  }

  function updateSignatario(idx: number, field: keyof Signatario, value: string) {
    const updated = [...signatarios];
    updated[idx] = { ...updated[idx], [field]: value };
    setSignatarios(updated);
  }

  async function handleEnviar() {
    if (!contratoGerado || !selectedTemplate) return;

    // Validate signatarios
    for (const s of signatarios) {
      if (!s.nome || !s.email || !s.papel) {
        setEnvioErro("Preencha todos os campos dos signatários.");
        return;
      }
      if (!isValidEmail(s.email)) {
        setEnvioErro(`E-mail inválido: ${s.email}`);
        return;
      }
    }

    setEtapa("enviando");
    setEnvioErro(null);
    try {
      const res = await fetch(`/api/templates-contrato/${selectedTemplate.id}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoId: contratoGerado.id,
          signatarios,
          mensagem: mensagemEnvio || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.erro ?? "Erro ao enviar.");
      }

      setEnvioResultado("Contrato enviado para assinatura com sucesso!");
      setEtapa("enviar");
    } catch (err) {
      setEnvioErro(err instanceof Error ? err.message : "Erro desconhecido.");
      setEtapa("enviar");
    }
  }

  // ── Delete Template ─────────────────────────────────────────

  async function handleDelete(templateId: string) {
    if (!confirm("Deseja realmente remover este template?")) return;
    try {
      await fetch(`/api/templates-contrato/${templateId}`, { method: "DELETE" });
      await fetchTemplates();
    } catch {
      alert("Erro ao remover template.");
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos de Contrato</h1>
          <p className="text-sm text-gray-500">
            Crie, gerencie e gere contratos padronizados a partir de templates.
          </p>
        </div>
        {etapa === "lista" && (
          <button
            onClick={() => setEtapa("upload")}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Novo Template
          </button>
        )}
        {etapa !== "lista" && (
          <button
            onClick={() => {
              setEtapa("lista");
              setSelectedTemplate(null);
              setContratoGerado(null);
              setEnvioResultado(null);
            }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Voltar para lista
          </button>
        )}
      </div>

      {/* ── Etapa: Lista de Templates ── */}
      {etapa === "lista" && (
        <>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-500">Nenhum template cadastrado.</p>
              <button
                onClick={() => setEtapa("upload")}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Criar primeiro template
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.nome}</h3>
                      <span className="inline-block mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {TIPO_LABELS[t.tipo] ?? t.tipo}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                      title="Remover"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {(t.variaveis as string[]).length} variáveis: {(t.variaveis as string[]).slice(0, 5).map((v) => `{{${v}}}`).join(", ")}
                    {(t.variaveis as string[]).length > 5 && "..."}
                  </p>
                  <button
                    onClick={() => selectTemplate(t)}
                    className="w-full rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Usar Template
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Etapa: Upload de Template ── */}
      {etapa === "upload" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Novo Template de Contrato</h2>
          <p className="mb-4 text-sm text-gray-500">
            Envie um arquivo .docx ou .txt com variáveis no formato <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{"{{nome_variavel}}"}</code>.
            As variáveis serão automaticamente detectadas.
          </p>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome do Template</label>
                <input
                  type="text"
                  required
                  value={uploadNome}
                  onChange={(e) => setUploadNome(e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviços"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={uploadTipo}
                  onChange={(e) => setUploadTipo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Arquivo (.docx ou .txt)</label>
              <input
                type="file"
                required
                accept=".docx,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700"
              />
            </div>
            {uploadErro && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{uploadErro}</div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Enviando..." : "Criar Template"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Etapa: Preencher Template ── */}
      {(etapa === "preencher" || etapa === "gerando") && selectedTemplate && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Form */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Dados do Contrato
              </h2>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Identificador</label>
                    <input
                      type="text"
                      value={metaDados.identificador}
                      onChange={(e) => setMetaDados((m) => ({ ...m, identificador: e.target.value }))}
                      placeholder="Número do contrato"
                      className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Contratante</label>
                    <input
                      type="text"
                      value={metaDados.contratante}
                      onChange={(e) => setMetaDados((m) => ({ ...m, contratante: e.target.value }))}
                      className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">CNPJ Contratante</label>
                    <input
                      type="text"
                      value={metaDados.cnpjContratante}
                      onChange={(e) => setMetaDados((m) => ({ ...m, cnpjContratante: applyCnpjMask(e.target.value) }))}
                      placeholder="XX.XXX.XXX/XXXX-XX"
                      maxLength={18}
                      className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
                        ${validationErrors.cnpjContratante ? "border-red-300 bg-red-50 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`}
                    />
                    {validationErrors.cnpjContratante && (
                      <p className="mt-0.5 text-xs text-red-500">{validationErrors.cnpjContratante}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">E-mail Contratante</label>
                    <input
                      type="email"
                      value={metaDados.emailContratante}
                      onChange={(e) => setMetaDados((m) => ({ ...m, emailContratante: e.target.value }))}
                      placeholder="email@exemplo.com"
                      className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
                        ${validationErrors.emailContratante ? "border-red-300 bg-red-50 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`}
                    />
                    {validationErrors.emailContratante && (
                      <p className="mt-0.5 text-xs text-red-500">{validationErrors.emailContratante}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Contratado</label>
                    <input
                      type="text"
                      value={metaDados.contratado}
                      onChange={(e) => setMetaDados((m) => ({ ...m, contratado: e.target.value }))}
                      className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">CNPJ Contratado</label>
                    <input
                      type="text"
                      value={metaDados.cnpjContratado}
                      onChange={(e) => setMetaDados((m) => ({ ...m, cnpjContratado: applyCnpjMask(e.target.value) }))}
                      placeholder="XX.XXX.XXX/XXXX-XX"
                      maxLength={18}
                      className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
                        ${validationErrors.cnpjContratado ? "border-red-300 bg-red-50 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`}
                    />
                    {validationErrors.cnpjContratado && (
                      <p className="mt-0.5 text-xs text-red-500">{validationErrors.cnpjContratado}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">E-mail Contratado</label>
                    <input
                      type="email"
                      value={metaDados.emailContratado}
                      onChange={(e) => setMetaDados((m) => ({ ...m, emailContratado: e.target.value }))}
                      placeholder="email@exemplo.com"
                      className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
                        ${validationErrors.emailContratado ? "border-red-300 bg-red-50 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`}
                    />
                    {validationErrors.emailContratado && (
                      <p className="mt-0.5 text-xs text-red-500">{validationErrors.emailContratado}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Data Início</label>
                    <input
                      type="text"
                      value={metaDados.dataInicio}
                      onChange={(e) => setMetaDados((m) => ({ ...m, dataInicio: applyDateMask(e.target.value) }))}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
                        ${validationErrors.dataInicio ? "border-red-300 bg-red-50 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`}
                    />
                    {validationErrors.dataInicio && (
                      <p className="mt-0.5 text-xs text-red-500">{validationErrors.dataInicio}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Data Fim</label>
                    <input
                      type="text"
                      value={metaDados.dataFim}
                      onChange={(e) => setMetaDados((m) => ({ ...m, dataFim: applyDateMask(e.target.value) }))}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1
                        ${validationErrors.dataFim ? "border-red-300 bg-red-50 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`}
                    />
                    {validationErrors.dataFim && (
                      <p className="mt-0.5 text-xs text-red-500">{validationErrors.dataFim}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Template Variables */}
            {(selectedTemplate.variaveis as string[]).length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Variáveis do Template ({(selectedTemplate.variaveis as string[]).length})
                </h2>
                <div className="space-y-3">
                  {(selectedTemplate.variaveis as string[]).map((varName) => (
                    <div key={varName}>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        {`{{${varName}}}`}
                      </label>
                      <input
                        type="text"
                        value={valores[varName] ?? ""}
                        onChange={(e) => updateValor(varName, e.target.value)}
                        placeholder={`Valor para ${varName}`}
                        className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleGenerar}
                disabled={etapa === "gerando"}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 disabled:opacity-50"
              >
                {etapa === "gerando" ? "Gerando..." : "Gerar Contrato"}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Preview</h2>
            <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {previewTexto}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Etapa: Enviar para Assinatura ── */}
      {(etapa === "enviar" || etapa === "enviando") && contratoGerado && (
        <div className="space-y-6">
          {/* Success message */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-5">
            <h2 className="text-lg font-semibold text-green-800">Contrato Gerado com Sucesso!</h2>
            <p className="mt-1 text-sm text-green-700">
              Contrato <strong>{contratoGerado.identificador ?? contratoGerado.id}</strong> criado.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => router.push(`/contratos/${contratoGerado.id}`)}
                className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                Ver Contrato
              </button>
              <a
                href={`/api/contratos/${contratoGerado.id}/pdf`}
                target="_blank"
                className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                Baixar PDF
              </a>
            </div>
          </div>

          {envioResultado ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
              <p className="text-sm font-medium text-green-700">{envioResultado}</p>
              <button
                onClick={() => {
                  setEtapa("lista");
                  setContratoGerado(null);
                  setEnvioResultado(null);
                }}
                className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Voltar para Templates
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Enviar para Assinatura</h2>

              <div className="space-y-4">
                {signatarios.map((s, idx) => (
                  <div key={idx} className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Nome</label>
                      <input
                        type="text"
                        value={s.nome}
                        onChange={(e) => updateSignatario(idx, "nome", e.target.value)}
                        placeholder="Nome completo"
                        className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">E-mail</label>
                      <input
                        type="email"
                        value={s.email}
                        onChange={(e) => updateSignatario(idx, "email", e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Papel</label>
                      <select
                        value={s.papel}
                        onChange={(e) => updateSignatario(idx, "papel", e.target.value)}
                        className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="contratante">Contratante</option>
                        <option value="contratado">Contratado</option>
                        <option value="testemunha">Testemunha</option>
                        <option value="representante">Representante</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      {signatarios.length > 1 && (
                        <button
                          onClick={() => removeSignatario(idx)}
                          className="rounded p-1.5 text-red-400 hover:text-red-600"
                          title="Remover"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={addSignatario}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  + Adicionar Signatário
                </button>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Mensagem (opcional)</label>
                  <textarea
                    rows={3}
                    value={mensagemEnvio}
                    onChange={(e) => setMensagemEnvio(e.target.value)}
                    placeholder="Mensagem a ser incluída no e-mail..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {envioErro && (
                  <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{envioErro}</div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEtapa("lista");
                      setContratoGerado(null);
                    }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Pular
                  </button>
                  <button
                    onClick={handleEnviar}
                    disabled={etapa === "enviando"}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {etapa === "enviando" ? "Enviando..." : "Enviar para Assinatura"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
