-- CreateIndex
CREATE INDEX "Alerta_contratoId_idx" ON "Alerta"("contratoId");

-- CreateIndex
CREATE INDEX "Alerta_status_idx" ON "Alerta"("status");

-- CreateIndex
CREATE INDEX "Alerta_dataAlerta_idx" ON "Alerta"("dataAlerta");

-- CreateIndex
CREATE INDEX "CalendarioFiscalCliente_clienteId_idx" ON "CalendarioFiscalCliente"("clienteId");

-- CreateIndex
CREATE INDEX "CalendarioFiscalCliente_competencia_idx" ON "CalendarioFiscalCliente"("competencia");

-- CreateIndex
CREATE INDEX "CalendarioFiscalCliente_status_idx" ON "CalendarioFiscalCliente"("status");

-- CreateIndex
CREATE INDEX "Cliente_escritorioId_idx" ON "Cliente"("escritorioId");

-- CreateIndex
CREATE INDEX "Cliente_cnpj_idx" ON "Cliente"("cnpj");

-- CreateIndex
CREATE INDEX "Contrato_clienteId_idx" ON "Contrato"("clienteId");

-- CreateIndex
CREATE INDEX "Contrato_status_idx" ON "Contrato"("status");

-- CreateIndex
CREATE INDEX "Contrato_dataFim_idx" ON "Contrato"("dataFim");

-- CreateIndex
CREATE INDEX "LancamentoHonorario_honorarioId_idx" ON "LancamentoHonorario"("honorarioId");

-- CreateIndex
CREATE INDEX "LancamentoHonorario_status_idx" ON "LancamentoHonorario"("status");

-- CreateIndex
CREATE INDEX "LancamentoHonorario_vencimento_idx" ON "LancamentoHonorario"("vencimento");

-- CreateIndex
CREATE INDEX "Notificacao_escritorioId_idx" ON "Notificacao"("escritorioId");

-- CreateIndex
CREATE INDEX "Notificacao_lida_idx" ON "Notificacao"("lida");
