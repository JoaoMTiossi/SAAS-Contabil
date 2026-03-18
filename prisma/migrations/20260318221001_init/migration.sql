-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'colaborador');

-- CreateEnum
CREATE TYPE "RegimeTributario" AS ENUM ('simples_nacional', 'lucro_presumido', 'lucro_real', 'mei');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('ativo', 'encerrado', 'renovado', 'cancelado');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('pendente', 'pago', 'cancelado', 'atrasado');

-- CreateEnum
CREATE TYPE "StatusObrigacao" AS ENUM ('pendente', 'entregue', 'cancelado', 'atrasado');

-- CreateEnum
CREATE TYPE "StatusAlerta" AS ENUM ('agendado', 'enviado', 'cancelado');

-- CreateEnum
CREATE TYPE "PrioridadeAlerta" AS ENUM ('info', 'atencao', 'urgente', 'critico');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('vencimento_geral', 'parcela', 'obrigacao', 'renovacao');

-- CreateEnum
CREATE TYPE "NivelConfianca" AS ENUM ('alta', 'media', 'baixa');

-- CreateEnum
CREATE TYPE "TipoTemplate" AS ENUM ('prestacao_servicos', 'consultoria', 'bpo', 'aditivo', 'distrato', 'custom');

-- CreateEnum
CREATE TYPE "TipoVersao" AS ENUM ('original', 'aditivo', 'reajuste', 'correcao');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('pendente', 'visualizado', 'assinado', 'expirado');

-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('mensal', 'trimestral', 'anual');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoObrigacaoFiscal" AS ENUM ('acessoria', 'imposto');

-- CreateEnum
CREATE TYPE "StatusObrigacaoFiscal" AS ENUM ('pendente', 'em_andamento', 'entregue', 'atrasada');

-- CreateEnum
CREATE TYPE "CategoriaTimesheet" AS ENUM ('fiscal', 'contabil', 'dp', 'consultoria', 'administrativo');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('dashboard', 'email');

-- CreateEnum
CREATE TYPE "LLMProviderEnum" AS ENUM ('openai', 'gemini');

-- CreateTable
CREATE TABLE "Escritorio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escritorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscritorioConfig" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "llmProvider" "LLMProviderEnum" NOT NULL DEFAULT 'openai',
    "llmApiKey" TEXT,
    "llmModel" TEXT,
    "emailRemetente" TEXT,

    CONSTRAINT "EscritorioConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'colaborador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "regimeTributario" "RegimeTributario",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateContrato" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" "TipoTemplate" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "variaveis" JSONB NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "identificador" TEXT,
    "contratante" TEXT,
    "contratado" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "renovacaoAutomatica" BOOLEAN,
    "prazoAvisoCancelamento" TIMESTAMP(3),
    "status" "StatusContrato" NOT NULL DEFAULT 'ativo',
    "confiancaVencimento" "NivelConfianca" NOT NULL DEFAULT 'baixa',
    "confiancaParcelas" "NivelConfianca" NOT NULL DEFAULT 'baixa',
    "confiancaObrigacoes" "NivelConfianca" NOT NULL DEFAULT 'baixa',
    "textoOriginal" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoVersao" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "tipo" "TipoVersao" NOT NULL,
    "descricao" TEXT,
    "conteudo" TEXT NOT NULL,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContratoVersao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoEvento" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContratoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2),
    "vencimento" TIMESTAMP(3),
    "status" "StatusParcela" NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obrigacao" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavel" TEXT,
    "prazo" TIMESTAMP(3),
    "status" "StatusObrigacao" NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obrigacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "parcelaId" TEXT,
    "obrigacaoId" TEXT,
    "refTipo" "TipoAlerta" NOT NULL,
    "refDescricao" TEXT NOT NULL,
    "dataAlerta" TIMESTAMP(3) NOT NULL,
    "antecedenciaDias" INTEGER NOT NULL,
    "prioridade" "PrioridadeAlerta" NOT NULL,
    "canais" TEXT[],
    "status" "StatusAlerta" NOT NULL DEFAULT 'agendado',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "StatusAssinatura" NOT NULL DEFAULT 'pendente',
    "assinadoEm" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Honorario" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "contratoId" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'mensal',
    "diaVencimento" INTEGER NOT NULL,
    "indiceReajuste" TEXT,
    "percentualReajuste" DECIMAL(5,2),
    "dataProximoReajuste" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Honorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoHonorario" (
    "id" TEXT NOT NULL,
    "honorarioId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusLancamento" NOT NULL DEFAULT 'pendente',
    "dataPagamento" TIMESTAMP(3),
    "valorPago" DECIMAL(12,2),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoHonorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObrigacaoFiscal" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "tipo" "TipoObrigacaoFiscal" NOT NULL,
    "regimes" "RegimeTributario"[],
    "diaVencimento" INTEGER,
    "mesVencimento" INTEGER,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'mensal',
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObrigacaoFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarioFiscalCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "obrigacaoId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusObrigacaoFiscal" NOT NULL DEFAULT 'pendente',
    "responsavelId" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarioFiscalCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanBoard" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Rescisões',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColuna" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "cor" TEXT,

    CONSTRAINT "KanbanColuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanCard" (
    "id" TEXT NOT NULL,
    "colunaId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "motivo" TEXT,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevisao" TIMESTAMP(3),
    "observacao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanChecklist" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KanbanChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "categoria" "CategoriaTimesheet" NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TIMESTAMP(3),
    "horaFim" TIMESTAMP(3),
    "duracao" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaProdutividade" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "metaHoras" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaProdutividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "canal" "CanalNotificacao" NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "destinatarioEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escritorio_cnpj_key" ON "Escritorio"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "EscritorioConfig_escritorioId_key" ON "EscritorioConfig"("escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_token_key" ON "Assinatura"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MetaProdutividade_usuarioId_mes_key" ON "MetaProdutividade"("usuarioId", "mes");

-- AddForeignKey
ALTER TABLE "EscritorioConfig" ADD CONSTRAINT "EscritorioConfig_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateContrato" ADD CONSTRAINT "TemplateContrato_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVersao" ADD CONSTRAINT "ContratoVersao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoEvento" ADD CONSTRAINT "ContratoEvento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obrigacao" ADD CONSTRAINT "Obrigacao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_obrigacaoId_fkey" FOREIGN KEY ("obrigacaoId") REFERENCES "Obrigacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honorario" ADD CONSTRAINT "Honorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoHonorario" ADD CONSTRAINT "LancamentoHonorario_honorarioId_fkey" FOREIGN KEY ("honorarioId") REFERENCES "Honorario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioFiscalCliente" ADD CONSTRAINT "CalendarioFiscalCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioFiscalCliente" ADD CONSTRAINT "CalendarioFiscalCliente_obrigacaoId_fkey" FOREIGN KEY ("obrigacaoId") REFERENCES "ObrigacaoFiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioFiscalCliente" ADD CONSTRAINT "CalendarioFiscalCliente_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanBoard" ADD CONSTRAINT "KanbanBoard_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColuna" ADD CONSTRAINT "KanbanColuna_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "KanbanBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_colunaId_fkey" FOREIGN KEY ("colunaId") REFERENCES "KanbanColuna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanChecklist" ADD CONSTRAINT "KanbanChecklist_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "KanbanCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaProdutividade" ADD CONSTRAINT "MetaProdutividade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
