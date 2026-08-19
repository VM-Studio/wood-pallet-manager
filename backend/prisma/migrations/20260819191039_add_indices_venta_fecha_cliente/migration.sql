-- CreateIndex
CREATE INDEX "ventas_fechaVenta_idx" ON "ventas"("fechaVenta");

-- CreateIndex
CREATE INDEX "ventas_clienteId_fechaVenta_idx" ON "ventas"("clienteId", "fechaVenta");
