-- CreateEnum
CREATE TYPE "EstadoSolicitudLogistica" AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- CreateTable
CREATE TABLE "solicitudes_logistica" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER,
    "solicitanteId" INTEGER NOT NULL,
    "destinatarioId" INTEGER NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" TIMESTAMP(3),
    "cantidadUnidades" INTEGER,
    "ubicacionEntrega" TEXT,
    "notas" TEXT,
    "estado" "EstadoSolicitudLogistica" NOT NULL DEFAULT 'pendiente',
    "fechaRespuesta" TIMESTAMP(3),
    "notasRespuesta" TEXT,

    CONSTRAINT "solicitudes_logistica_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "solicitudes_logistica" ADD CONSTRAINT "solicitudes_logistica_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_logistica" ADD CONSTRAINT "solicitudes_logistica_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_logistica" ADD CONSTRAINT "solicitudes_logistica_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
