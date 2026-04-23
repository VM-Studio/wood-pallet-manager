-- CreateEnum
CREATE TYPE "EstadoRemito" AS ENUM ('pendiente_firma_propietario', 'enviado_a_cliente', 'firmado_por_cliente', 'completado', 'cancelado');

-- CreateTable
CREATE TABLE "remitos" (
    "id" SERIAL NOT NULL,
    "numeroRemito" TEXT,
    "ventaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" TIMESTAMP(3),
    "estado" "EstadoRemito" NOT NULL DEFAULT 'pendiente_firma_propietario',
    "firmaPropietario" TEXT,
    "fechaFirmaPropietario" TIMESTAMP(3),
    "firmaCliente" TEXT,
    "fechaFirmaCliente" TIMESTAMP(3),
    "tokenFirma" TEXT NOT NULL,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "fechaEmailEnviado" TIMESTAMP(3),
    "observaciones" TEXT,

    CONSTRAINT "remitos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "remitos_ventaId_key" ON "remitos"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "remitos_tokenFirma_key" ON "remitos"("tokenFirma");

-- AddForeignKey
ALTER TABLE "remitos" ADD CONSTRAINT "remitos_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remitos" ADD CONSTRAINT "remitos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remitos" ADD CONSTRAINT "remitos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
